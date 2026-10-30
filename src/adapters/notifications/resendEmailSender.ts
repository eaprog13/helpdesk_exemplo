import "server-only";
import { Resend } from "resend";
import type { RemetenteEmail, ResultadoEnvio } from "@/core/ports/notifications";
import type { Ticket } from "@/core/types";

// Nomes, perguntas e notas vêm de quem usa a aplicação: escapam-se antes de
// entrar no HTML do email, senão um cliente podia meter links ou HTML num
// email enviado em nome da empresa.
function escaparHtml(texto: string) {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function envolverHtml(titulo: string, corpoHtml: string) {
  // Cores de marca da Vértice Digital aplicadas também nos emails transacionais.
  return `
  <div style="font-family: Arial, sans-serif; background:#F4F6F8; padding:32px;">
    <div style="max-width:520px;margin:0 auto;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #E8ECF0;">
      <div style="background:#09182A;padding:20px 24px;">
        <span style="color:#FFFFFF;font-size:16px;font-weight:600;">Vértice Digital · Apoio ao Cliente</span>
      </div>
      <div style="padding:24px;color:#09182A;font-size:14px;line-height:1.6;">
        <h2 style="margin-top:0;color:#09182A;">${titulo}</h2>
        ${corpoHtml}
      </div>
    </div>
  </div>`;
}

/**
 * Implementa RemetenteEmail sobre o Resend. Para trocar de fornecedor de
 * email (SendGrid, Postmark, SES…), escrever uma nova classe que implemente
 * o mesmo port — nada no core muda.
 */
export class RemetenteEmailResend implements RemetenteEmail {
  private cliente: Resend | null = null;

  constructor(
    private readonly chaveApi: string,
    private readonly remetente: string,
    private readonly urlApp: string
  ) {}

  private obterCliente() {
    if (!this.chaveApi) return null;
    if (!this.cliente) this.cliente = new Resend(this.chaveApi);
    return this.cliente;
  }

  private async enviar(destinatario: string, assunto: string, html: string): Promise<ResultadoEnvio> {
    const cliente = this.obterCliente();
    if (!cliente) return { estado: "skipped", erro: "RESEND_API_KEY não configurada" };
    try {
      const { error } = await cliente.emails.send({ from: this.remetente, to: destinatario, subject: assunto, html });
      if (error) return { estado: "failed", erro: error.message };
      return { estado: "sent", erro: null };
    } catch (erro) {
      return { estado: "failed", erro: (erro as Error).message };
    }
  }

  async enviarCredenciais(destinatario: string, nomeCompleto: string, palavraPasseTemporaria: string): Promise<ResultadoEnvio> {
    // Sem RESEND_API_KEY (ex.: ambiente local sem essa integração ligada
    // ainda), o email fica "skipped" — mas a password temporária, gerada
    // aleatoriamente, não fica guardada em mais lado nenhum. Sem isto, não
    // haveria forma nenhuma de testar o login de um cliente em local. Só
    // imprime fora de produção — nunca deve aparecer em logs reais.
    if (!this.chaveApi && process.env.NODE_ENV !== "production") {
      console.log(
        `\n📧 [email simulado — RESEND_API_KEY não configurada] Credenciais para ${destinatario}:\n` +
          `   Password temporária: ${palavraPasseTemporaria}\n`
      );
    }

    const html = envolverHtml(
      "As suas credenciais de acesso",
      `<p>Olá ${escaparHtml(nomeCompleto)},</p>
       <p>Foi criada uma conta para si no centro de apoio ao cliente da Vértice Digital.</p>
       <p><strong>Email:</strong> ${escaparHtml(destinatario)}<br/>
          <strong>Password temporária:</strong> ${escaparHtml(palavraPasseTemporaria)}</p>
       <p>Por segurança, ser-lhe-á pedido para definir uma nova password no primeiro acesso.</p>
       <p><a href="${this.urlApp}/login" style="color:#0F6E8C;">Aceder ao centro de apoio</a></p>`
    );
    return this.enviar(destinatario, "As suas credenciais de acesso — Apoio ao Cliente Vértice Digital", html);
  }

  async enviarTicketCriado(destinatario: string, nomeCompleto: string, ticket: Ticket): Promise<ResultadoEnvio> {
    // Sem canal novo dedicado a prioridade Crítica (Slack, SMS, …) por
    // agora — mas o assunto fica visualmente diferente para se destacar
    // de imediato na caixa de entrada, sem precisar de infraestrutura
    // nova. Aplica-se tanto ao email para o cliente (este) como, mais
    // tarde, a uma eventual notificação própria para o dev atribuído.
    const ehCritico = ticket.priority === "urgent";
    const prefixoAssunto = ehCritico ? "🔴 URGENTE — " : "";

    const html = envolverHtml(
      "Registámos o seu pedido",
      `<p>Olá ${escaparHtml(nomeCompleto)},</p>
       <p>A sua questão foi encaminhada para a nossa equipa técnica (ticket <strong>#${ticket.id.slice(
         0,
         8
       )}</strong>) porque não tínhamos uma resposta imediata na nossa base de conhecimento.</p>
       <p><em>"${escaparHtml(ticket.question)}"</em></p>
       <p>Vamos analisar o seu caso e voltamos a contactá-lo brevemente.</p>
       <p><a href="${this.urlApp}/tickets/${ticket.id}" style="color:#0F6E8C;">Acompanhar o pedido</a></p>`
    );
    return this.enviar(destinatario, `${prefixoAssunto}Pedido registado — ticket #${ticket.id.slice(0, 8)}`, html);
  }

  async enviarTicketAssumido(destinatario: string, nomeCompleto: string, ticket: Ticket): Promise<ResultadoEnvio> {
    const html = envolverHtml(
      "O seu pedido está a ser tratado",
      `<p>Olá ${escaparHtml(nomeCompleto)},</p>
       <p>O seu pedido (ticket <strong>#${ticket.id.slice(
         0,
         8
       )}</strong>) já foi assumido pela nossa equipa e está a ser tratado.</p>
       <p>Vamos voltar a contactá-lo assim que tivermos uma resposta.</p>
       <p><a href="${this.urlApp}/tickets/${ticket.id}" style="color:#0F6E8C;">Acompanhar o pedido</a></p>`
    );
    return this.enviar(destinatario, `O seu pedido está a ser tratado — ticket #${ticket.id.slice(0, 8)}`, html);
  }

  async enviarTicketResolvido(
    destinatario: string,
    nomeCompleto: string,
    ticket: Ticket,
    notaResolucao: string
  ): Promise<ResultadoEnvio> {
    const html = envolverHtml(
      "O seu pedido foi resolvido",
      `<p>Olá ${escaparHtml(nomeCompleto)},</p>
       <p>O ticket <strong>#${ticket.id.slice(0, 8)}</strong> foi marcado como resolvido:</p>
       <p>${escaparHtml(notaResolucao)}</p>
       <p><a href="${this.urlApp}/tickets/${ticket.id}" style="color:#0F6E8C;">Ver detalhes</a></p>`
    );
    return this.enviar(destinatario, `Pedido resolvido — ticket #${ticket.id.slice(0, 8)}`, html);
  }
}
