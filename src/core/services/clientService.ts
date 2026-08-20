import { randomBytes } from "crypto";
import type { Dependencias } from "@/core/deps";
import type { Departamento, Perfil, TipoSite } from "@/core/types";
import type { FicheiroParaCarregar } from "@/core/ports/storage";
import { ErroNaoEncontrado } from "./chatService";

// Mesmos limites definidos no bucket "logos" (supabase/schema.sql) — validar
// também aqui dá um erro claro e imediato, em vez de esperar pela rejeição
// silenciosa do Storage.
export const TIPOS_LOGO_PERMITIDOS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
  "image/webp": "webp",
};
export const TAMANHO_MAXIMO_LOGO = 2 * 1024 * 1024; // 2MB

export class TipoLogoInvalidoError extends Error {}

// Partilhado com teamService.ts (mesma necessidade: password forte e
// imprevisível, nunca escolhida por humano, para uma conta nova).
export function gerarPalavraPasseTemporaria() {
  // 16 bytes aleatórios → password forte e imprevisível, nunca escolhida por humano.
  return randomBytes(12).toString("base64url");
}

export interface DadosCriacaoCliente {
  email: string;
  nomeCompleto: string;
  nomeEmpresa: string;
  telefone?: string | null;
  /** Serviço(s) que o cliente tem contratado — obrigatório, ver Perfil.site_type em core/types.ts. */
  tiposSite: TipoSite[];
  /** Organização interna do admin — etiqueta opcional, ver Departamento em core/types.ts. */
  departamentos?: Departamento[];
}

/**
 * Cria a conta do cliente com uma password temporária gerada aleatoriamente
 * e envia-a por email. É assim que "o cliente recebe o login" antes de
 * poder usar o chat — só depois de autenticar é que a caixa de pergunta
 * fica acessível (ver middleware/guard da camada web).
 */
export async function criarCliente(dependencias: Dependencias, dados: DadosCriacaoCliente) {
  const palavraPasseTemporaria = gerarPalavraPasseTemporaria();

  const criado = await dependencias.identidade.criarUtilizador({
    email: dados.email,
    palavraPasse: palavraPasseTemporaria,
    metadados: {
      role: "client",
      full_name: dados.nomeCompleto,
      company_name: dados.nomeEmpresa,
      phone: dados.telefone ?? null,
    },
  });

  // O trigger "handle_new_user" (supabase/schema.sql) não conhece
  // "department" nem "site_type" — só lê role/full_name/company_name/phone
  // de raw_user_meta_data — por isso esta segunda chamada. site_type é
  // sempre definido (obrigatório); department só quando há algo para
  // gravar (evita uma escrita vazia no caso comum de um cliente sem
  // nenhum departamento assinalado, que já nasce com '{}' por omissão).
  await dependencias.perfis.atualizar(criado.id, {
    site_type: dados.tiposSite,
    ...(dados.departamentos && dados.departamentos.length > 0 ? { department: dados.departamentos } : {}),
  });

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

  return { id: criado.id, email: dados.email, nomeCompleto: dados.nomeCompleto, nomeEmpresa: dados.nomeEmpresa };
}

export async function listarClientes(dependencias: Dependencias): Promise<Perfil[]> {
  return dependencias.perfis.listarClientes();
}

/**
 * Corrige os departamentos (etiqueta organizacional, ver Departamento em
 * core/types.ts) de um cliente já existente — a criação só permitia
 * defini-los uma vez, na altura de criarCliente().
 */
export async function atualizarDepartamentosCliente(
  dependencias: Dependencias,
  idCliente: string,
  departamentos: Departamento[]
): Promise<Perfil> {
  const clienteAtual = await dependencias.perfis.obterPorId(idCliente);
  if (!clienteAtual || clienteAtual.role !== "client") {
    throw new ErroNaoEncontrado("Cliente não encontrado.");
  }
  await dependencias.perfis.atualizar(idCliente, { department: departamentos });
  return { ...clienteAtual, department: departamentos };
}

/**
 * Corrige o(s) serviço(s) (site_type, ver core/types.ts) de um cliente já
 * existente — a criação só permitia defini-los uma vez, na altura de
 * criarCliente(). Ao contrário do departamento, nunca fica vazio — a rota
 * (esquemaAlteracoes, ver api/admin/clients/[id]/route.ts) já exige pelo
 * menos um valor antes de chegar aqui.
 */
export async function atualizarServicosCliente(
  dependencias: Dependencias,
  idCliente: string,
  tiposSite: TipoSite[]
): Promise<Perfil> {
  const clienteAtual = await dependencias.perfis.obterPorId(idCliente);
  if (!clienteAtual || clienteAtual.role !== "client") {
    throw new ErroNaoEncontrado("Cliente não encontrado.");
  }
  await dependencias.perfis.atualizar(idCliente, { site_type: tiposSite });
  return { ...clienteAtual, site_type: tiposSite };
}

/**
 * Carrega/substitui o logótipo de um cliente — mostrado no cabeçalho da
 * área do cliente depois de autenticar (ver components/layout/Header.tsx).
 * Um upload novo substitui sempre o anterior (mesmo caminho no Storage).
 */
export async function atualizarLogotipoCliente(
  dependencias: Dependencias,
  idCliente: string,
  ficheiro: { conteudo: Buffer; tipoConteudo: string }
): Promise<string> {
  const extensao = TIPOS_LOGO_PERMITIDOS[ficheiro.tipoConteudo];
  if (!extensao) {
    throw new TipoLogoInvalidoError(
      `Tipo de ficheiro não suportado (${ficheiro.tipoConteudo}). Use PNG, JPEG, SVG ou WEBP.`
    );
  }
  if (ficheiro.conteudo.byteLength > TAMANHO_MAXIMO_LOGO) {
    throw new TipoLogoInvalidoError("O ficheiro excede o tamanho máximo de 2MB.");
  }

  const dadosFicheiro: FicheiroParaCarregar = {
    conteudo: ficheiro.conteudo,
    tipoConteudo: ficheiro.tipoConteudo,
    extensao,
  };
  const url = await dependencias.armazenamento.carregarLogotipoCliente(idCliente, dadosFicheiro);
  await dependencias.perfis.atualizar(idCliente, { logo_url: url });
  return url;
}
