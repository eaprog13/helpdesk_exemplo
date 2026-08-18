import type { Dependencias } from "@/core/deps";
import type { UtilizadorAutenticado, Perfil, Ticket, PrioridadeTicket, EstadoTicket } from "@/core/types";
import { ErroAcessoNegado, ErroNaoEncontrado, notificarEventoTicket } from "./chatService";

export { ErroAcessoNegado, ErroNaoEncontrado };

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
  const atualizacoes = await dependencias.atualizacoesTicket.listarPorTicket(idTicket, {
    apenasVisivelParaCliente: !ehEquipa,
  });

  return { ticket, atualizacoes };
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
