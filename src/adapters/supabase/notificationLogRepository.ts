import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RepositorioRegistoNotificacao } from "@/core/ports/repositories";

export class RepositorioRegistoNotificacaoSupabase implements RepositorioRegistoNotificacao {
  constructor(private readonly bd: SupabaseClient) {}

  async registar(entrada: Parameters<RepositorioRegistoNotificacao["registar"]>[0]): Promise<void> {
    const { error } = await this.bd.from("notifications_log").insert({
      client_id: entrada.idCliente,
      ticket_id: entrada.idTicket,
      channel: entrada.canal,
      event: entrada.evento,
      status: entrada.estado,
      error: entrada.erro,
    });
    // Falha a registar uma notificação não deve impedir o fluxo principal
    // (o email/whatsapp já foi tentado); regista-se apenas para diagnóstico.
    if (error) console.error(`[registoNotificacoes.registar] ${error.message}`);
  }
}
