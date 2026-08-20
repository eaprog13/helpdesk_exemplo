import type { Dependencias } from "@/core/deps";
import type { Departamento, Perfil } from "@/core/types";
import { gerarPalavraPasseTemporaria } from "./clientService";
import { ErroNaoEncontrado } from "./chatService";

export interface DadosCriacaoMembroEquipa {
  email: string;
  nomeCompleto: string;
  role: "dev" | "admin";
  /**
   * Departamento(s) do membro — decide elegibilidade na atribuição
   * automática de tickets (ver escolherDevPorMenorCarga em
   * ticketService.ts). Um 'admin' também pode ter departamento (torna-o
   * candidato à atribuição automática, tal como um dev — ver
   * supabase/provisionar_equipa.sql, caso do Ricardo). "geral" nunca entra
   * nessa atribuição automática, mas continua válido de escolher (fica
   * disponível para atribuição manual num ticket "Por atribuir" → Geral).
   */
  departamentos?: Departamento[];
}

/**
 * Cria uma conta de equipa (dev ou admin) com password temporária e
 * envia-a por email — o equivalente, para a equipa, de criarCliente() em
 * clientService.ts. Substitui o fluxo manual descrito em
 * supabase/provisionar_equipa.sql (criar o utilizador no painel do
 * Supabase e depois correr um UPDATE à mão): agora é só um formulário em
 * /admin/team.
 */
export async function criarMembroEquipa(dependencias: Dependencias, dados: DadosCriacaoMembroEquipa) {
  const palavraPasseTemporaria = gerarPalavraPasseTemporaria();

  const criado = await dependencias.identidade.criarUtilizador({
    email: dados.email,
    palavraPasse: palavraPasseTemporaria,
    metadados: {
      role: dados.role,
      full_name: dados.nomeCompleto,
    },
  });

  // Tal como em criarCliente(): o trigger "handle_new_user" não conhece
  // "department" — só grava depois de o perfil já existir, e só quando há
  // algo para gravar.
  if (dados.departamentos && dados.departamentos.length > 0) {
    await dependencias.perfis.atualizar(criado.id, { department: dados.departamentos });
  }

  const resultadoEmail = await dependencias.email.enviarCredenciais(
    dados.email,
    dados.nomeCompleto,
    palavraPasseTemporaria
  );
  await dependencias.registoNotificacoes.registar({
    idCliente: criado.id,
    idTicket: null,
    canal: "email",
    evento: "credentials_issued",
    estado: resultadoEmail.estado,
    erro: resultadoEmail.erro,
  });

  return { id: criado.id, email: dados.email, nomeCompleto: dados.nomeCompleto, role: dados.role };
}

export interface DadosAtualizacaoMembroEquipa {
  role?: "dev" | "admin";
  departamentos?: Departamento[];
}

/**
 * Corrige role e/ou departamento(s) de um membro de equipa já existente —
 * a criação (criarMembroEquipa) só permitia defini-los uma vez. É o que
 * faltava para /admin/team fechar o ciclo: sem isto, mudar o departamento
 * de um dev que já existe continuava a exigir SQL manual (ver
 * supabase/provisionar_equipa.sql).
 */
export async function atualizarMembroEquipa(
  dependencias: Dependencias,
  idMembro: string,
  dados: DadosAtualizacaoMembroEquipa
): Promise<Perfil> {
  const membroAtual = await dependencias.perfis.obterPorId(idMembro);
  if (!membroAtual || (membroAtual.role !== "dev" && membroAtual.role !== "admin")) {
    throw new ErroNaoEncontrado("Membro da equipa não encontrado.");
  }

  const alteracoes: Partial<Perfil> = {};
  if (dados.role !== undefined) alteracoes.role = dados.role;
  if (dados.departamentos !== undefined) alteracoes.department = dados.departamentos;

  if (Object.keys(alteracoes).length > 0) {
    await dependencias.perfis.atualizar(idMembro, alteracoes);
  }

  return { ...membroAtual, ...alteracoes };
}
