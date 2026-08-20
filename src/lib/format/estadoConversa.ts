import type { EstadoTicket, Ticket } from "@/core/types";

/** Estado "efetivo" de uma conversa, para mostrar no histórico do cliente. */
export type EstadoConversa = EstadoTicket | "auto";

// Ordem de prioridade ao escolher, entre vários tickets da mesma conversa,
// qual estado mostrar: o menos resolvido primeiro — é o que mais importa
// ao cliente saber de relance ("isto ainda está em aberto?").
const PRIORIDADE_ESTADO: EstadoTicket[] = ["open", "in_progress", "resolved", "closed"];

/**
 * Deriva o estado de uma conversa a partir dos tickets associados a ela.
 * Sem nenhum ticket, a conversa foi respondida sem precisar de intervenção
 * humana (histórico do cliente ou base de conhecimento — ver
 * core/services/chatService.ts) → "auto". Com um ou mais tickets, mostra o
 * estado menos resolvido entre eles.
 */
export function estadoConversa(ticketsDaConversa: Ticket[]): EstadoConversa {
  const primeiroTicket = ticketsDaConversa[0];
  if (!primeiroTicket) return "auto";
  const estadoPrioritario = PRIORIDADE_ESTADO.find((estado) =>
    ticketsDaConversa.some((ticket) => ticket.status === estado)
  );
  return estadoPrioritario ?? primeiroTicket.status;
}
