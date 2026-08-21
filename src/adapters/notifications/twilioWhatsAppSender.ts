import "server-only";
import twilio from "twilio";
import type { RemetenteWhatsApp, ResultadoEnvio } from "@/core/ports/notifications";
import type { Ticket } from "@/core/types";

/**
 * Implementa RemetenteWhatsApp sobre o Twilio. Para trocar para a API
 * oficial da Meta (WhatsApp Cloud API) ou outro fornecedor, escrever uma
 * nova classe que implemente o mesmo port — nada no core muda.
 */
export class RemetenteWhatsAppTwilio implements RemetenteWhatsApp {
  private cliente: ReturnType<typeof twilio> | null = null;

  constructor(
    private readonly sidConta: string,
    private readonly tokenAutenticacao: string,
    private readonly remetente: string,
    private readonly ativo: boolean
  ) {}

  private obterCliente() {
    if (!this.sidConta || !this.tokenAutenticacao) return null;
    if (!this.cliente) this.cliente = twilio(this.sidConta, this.tokenAutenticacao);
    return this.cliente;
  }

  private async enviar(telefoneE164: string, corpo: string): Promise<ResultadoEnvio> {
    if (!this.ativo) return { estado: "skipped", erro: "Notificações WhatsApp desativadas" };
    const cliente = this.obterCliente();
    if (!cliente || !this.remetente) return { estado: "skipped", erro: "Twilio não configurado" };
    try {
      await cliente.messages.create({ from: this.remetente, to: `whatsapp:${telefoneE164}`, body: corpo });
      return { estado: "sent", erro: null };
    } catch (erro) {
      return { estado: "failed", erro: (erro as Error).message };
    }
  }

  async enviarTicketCriado(telefoneE164: string, nomeCompleto: string, ticket: Ticket): Promise<ResultadoEnvio> {
    return this.enviar(
      telefoneE164,
      `Olá ${nomeCompleto}, a Vértice Digital registou o seu pedido (ticket #${ticket.id.slice(
        0,
        8
      )}). A nossa equipa vai analisar e voltamos a contactá-lo em breve.`
    );
  }

  async enviarTicketResolvido(telefoneE164: string, nomeCompleto: string, ticket: Ticket): Promise<ResultadoEnvio> {
    return this.enviar(
      telefoneE164,
      `Olá ${nomeCompleto}, o seu ticket #${ticket.id.slice(
        0,
        8
      )} junto da Vértice Digital foi resolvido. Consulte os detalhes na plataforma de apoio ao cliente.`
    );
  }
}
