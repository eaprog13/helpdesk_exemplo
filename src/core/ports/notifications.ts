// Ports dos canais de acompanhamento do cliente. Trocar Resend por SendGrid,
// ou Twilio pela API oficial da Meta, é escrever um novo adaptador — o core
// (core/services/*) nunca importa um SDK de email/WhatsApp diretamente.

import type { Ticket } from "@/core/types";

export interface ResultadoEnvio {
  estado: "sent" | "failed" | "skipped";
  erro: string | null;
}

export interface RemetenteEmail {
  enviarCredenciais(destinatario: string, nomeCompleto: string, palavraPasseTemporaria: string): Promise<ResultadoEnvio>;
  enviarTicketCriado(destinatario: string, nomeCompleto: string, ticket: Ticket): Promise<ResultadoEnvio>;
  /**
   * Mensagem genérica assim que um dev assume o ticket (open → in_progress)
   * — só avisa que já há alguém a tratar do pedido, sem detalhe nenhum do
   * caso (ver core/services/ticketService.ts, atualizarTicket).
   */
  enviarTicketAssumido(destinatario: string, nomeCompleto: string, ticket: Ticket): Promise<ResultadoEnvio>;
  enviarTicketResolvido(
    destinatario: string,
    nomeCompleto: string,
    ticket: Ticket,
    notaResolucao: string
  ): Promise<ResultadoEnvio>;
}

export interface RemetenteWhatsApp {
  enviarTicketCriado(telefoneE164: string, nomeCompleto: string, ticket: Ticket): Promise<ResultadoEnvio>;
  enviarTicketResolvido(telefoneE164: string, nomeCompleto: string, ticket: Ticket): Promise<ResultadoEnvio>;
}
