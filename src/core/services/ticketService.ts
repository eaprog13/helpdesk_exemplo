import type { Dependencias } from "@/core/deps";
import type {
  UtilizadorAutenticado,
  Perfil,
  Ticket,
  PrioridadeTicket,
  EstadoTicket,
  AnexoTicket,
  AnexoTicketComUrl,
} from "@/core/types";
import { ErroAcessoNegado, ErroNaoEncontrado, notificarEventoTicket } from "./chatService";

export { ErroAcessoNegado, ErroNaoEncontrado };

// Mesmos limites definidos no bucket "ticket-attachments" (supabase/schema.sql)
// — validar também aqui dá um erro claro e imediato, em vez de esperar pela
// rejeição silenciosa do Storage.
export const TIPOS_ANEXO_PERMITIDOS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf",
};
export const TAMANHO_MAXIMO_ANEXO = 5 * 1024 * 1024; // 5MB

export class TipoAnexoInvalidoError extends Error {}

/** Lista tickets: clientes só veem os próprios; staff (admin/dev) vê todos. */
export async function listarTickets(dependencias: Dependencias, perfil: Perfil): Promise<Ticket[]> {
  if (perfil.role === "client") {
    return dependencias.tickets.listarPorCliente(perfil.id);
  }
  return dependencias.tickets.listarTodos();
}

export async function obterTicketComAtualizacoes(dependencias: Dependencias, perfil: Perfil, idTicket: string) {
  const ticket = await dependencias.tickets.obterPorId(idTicket);
  if (!ticket) throw new ErroNaoEncontrado("Ticket não encontrado.");
  if (perfil.role === "client" && ticket.client_id !== perfil.id) {
    throw new ErroAcessoNegado("Acesso negado.");
  }

  const ehEquipa = perfil.role === "admin" || perfil.role === "dev";
  const [atualizacoes, anexos] = await Promise.all([
    dependencias.atualizacoesTicket.listarPorTicket(idTicket, { apenasVisivelParaCliente: !ehEquipa }),
    listarAnexosComUrl(dependencias, idTicket),
  ]);

  return { ticket, atualizacoes, anexos };
}

async function listarAnexosComUrl(dependencias: Dependencias, idTicket: string): Promise<AnexoTicketComUrl[]> {
  const anexos = await dependencias.anexosTicket.listarPorTicket(idTicket);
  return Promise.all(
    anexos.map(async (anexo): Promise<AnexoTicketComUrl> => ({
      ...anexo,
      url: await dependencias.armazenamento.obterUrlAnexoTicket(anexo.file_path),
    }))
  );
}

/**
 * Anexa um ficheiro (captura de ecrã, PDF) a um ticket — o cliente dono do
 * ticket ou staff. Chamado logo quando o ticket é aberto (aviso no chat) ou
 * mais tarde a partir do detalhe do pedido, para preparar o terreno para
 * quem vai analisar (ver components/ticket/AnexosTicket.tsx).
 */
export async function adicionarAnexoTicket(
  dependencias: Dependencias,
  utilizador: UtilizadorAutenticado,
  perfil: Perfil,
  dados: { idTicket: string; nomeFicheiro: string; conteudo: Buffer; tipoConteudo: string }
): Promise<AnexoTicketComUrl> {
  const ticket = await dependencias.tickets.obterPorId(dados.idTicket);
  if (!ticket) throw new ErroNaoEncontrado("Ticket não encontrado.");
  const ehEquipa = perfil.role === "admin" || perfil.role === "dev";
  if (!ehEquipa && ticket.client_id !== perfil.id) {
    throw new ErroAcessoNegado("Acesso negado.");
  }

  const extensao = TIPOS_ANEXO_PERMITIDOS[dados.tipoConteudo];
  if (!extensao) {
    throw new TipoAnexoInvalidoError(
      `Tipo de ficheiro não suportado (${dados.tipoConteudo}). Use PNG, JPEG, WEBP ou PDF.`
    );
  }
  if (dados.conteudo.byteLength > TAMANHO_MAXIMO_ANEXO) {
    throw new TipoAnexoInvalidoError("O ficheiro excede o tamanho máximo de 5MB.");
  }

  const caminho = await dependencias.armazenamento.carregarAnexoTicket(dados.idTicket, {
    conteudo: dados.conteudo,
    tipoConteudo: dados.tipoConteudo,
    extensao,
  });

  const anexo: AnexoTicket = await dependencias.anexosTicket.criar({
    idTicket: dados.idTicket,
    idUtilizador: utilizador.id,
    caminhoFicheiro: caminho,
    nomeFicheiro: dados.nomeFicheiro,
    tipoConteudo: dados.tipoConteudo,
    tamanhoBytes: dados.conteudo.byteLength,
  });

  const url = await dependencias.armazenamento.obterUrlAnexoTicket(anexo.file_path);
  return { ...anexo, url };
}

export interface DadosAtualizacaoTicket {
  estado?: EstadoTicket;
  prioridade?: PrioridadeTicket;
  idDevAtribuido?: string | null;
  nota?: string;
  notaVisivelParaCliente?: boolean;
}

/**
 * Apenas staff. Atualiza estado/prioridade/atribuição e/ou acrescenta uma
 * nota. Quando o estado passa a "resolved", dispara o acompanhamento do
 * cliente (email/WhatsApp).
 */
export async function atualizarTicket(
  dependencias: Dependencias,
  utilizadorEquipa: UtilizadorAutenticado,
  dados: DadosAtualizacaoTicket & { idTicket: string }
): Promise<Ticket> {
  const { idTicket, estado, prioridade, idDevAtribuido, nota, notaVisivelParaCliente } = dados;

  const alteracoes: Parameters<Dependencias["tickets"]["atualizar"]>[1] = {};
  if (estado) alteracoes.estado = estado;
  if (prioridade) alteracoes.prioridade = prioridade;
  if (idDevAtribuido !== undefined) alteracoes.idDevAtribuido = idDevAtribuido;
  if (estado === "resolved") alteracoes.dataResolucao = new Date().toISOString();

  let ticket =
    Object.keys(alteracoes).length > 0
      ? await dependencias.tickets.atualizar(idTicket, alteracoes)
      : await dependencias.tickets.obterPorId(idTicket);

  if (!ticket) throw new ErroNaoEncontrado("Ticket não encontrado.");

  if (nota) {
    await dependencias.atualizacoesTicket.criar({
      idTicket,
      idAutor: utilizadorEquipa.id,
      nota,
      visivelParaCliente: notaVisivelParaCliente ?? false,
    });
  }

  if (estado === "resolved") {
    const perfilCliente = await dependencias.perfis.obterPorId(ticket.client_id);
    const emailCliente = await dependencias.identidade.obterEmailPorId(ticket.client_id);

    if (perfilCliente && emailCliente) {
      await notificarEventoTicket(
        dependencias,
        "ticket_resolved",
        perfilCliente,
        emailCliente,
        ticket,
        nota ?? "O pedido foi resolvido pela nossa equipa."
      );
    }
  }

  return ticket;
}
