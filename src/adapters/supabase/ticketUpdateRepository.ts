import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RepositorioAtualizacaoTicket } from "@/core/ports/repositories";
import type { AtualizacaoTicket } from "@/core/types";

export class RepositorioAtualizacaoTicketSupabase implements RepositorioAtualizacaoTicket {
  constructor(private readonly bd: SupabaseClient) {}

  async criar(dados: Parameters<RepositorioAtualizacaoTicket["criar"]>[0]): Promise<AtualizacaoTicket> {
    const { data, error } = await this.bd
      .from("ticket_updates")
      .insert({
        ticket_id: dados.idTicket,
        author_id: dados.idAutor,
        note: dados.nota,
        visible_to_client: dados.visivelParaCliente,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(`[atualizacoesTicket.criar] ${error?.message}`);
    return data;
  }

  async listarPorTicket(
    idTicket: string,
    opcoes?: { apenasVisivelParaCliente?: boolean }
  ): Promise<AtualizacaoTicket[]> {
    let consulta = this.bd
      .from("ticket_updates")
      .select("*")
      .eq("ticket_id", idTicket)
      .order("created_at", { ascending: true });

    if (opcoes?.apenasVisivelParaCliente) {
      consulta = consulta.eq("visible_to_client", true);
    }

    const { data, error } = await consulta;
    if (error) throw new Error(`[atualizacoesTicket.listarPorTicket] ${error.message}`);
    return data ?? [];
  }
}
