import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnexoTicket } from "@/core/types";
import type { RepositorioAnexoTicket } from "@/core/ports/repositories";

export class RepositorioAnexoTicketSupabase implements RepositorioAnexoTicket {
  constructor(private readonly bd: SupabaseClient) {}

  async criar(dados: {
    idTicket: string;
    idUtilizador: string;
    caminhoFicheiro: string;
    nomeFicheiro: string;
    tipoConteudo: string;
    tamanhoBytes: number;
  }): Promise<AnexoTicket> {
    const { data, error } = await this.bd
      .from("ticket_attachments")
      .insert({
        ticket_id: dados.idTicket,
        uploaded_by: dados.idUtilizador,
        file_path: dados.caminhoFicheiro,
        file_name: dados.nomeFicheiro,
        content_type: dados.tipoConteudo,
        size_bytes: dados.tamanhoBytes,
      })
      .select()
      .single();
    if (error) throw new Error(`[anexosTicket.criar] ${error.message}`);
    return data as AnexoTicket;
  }

  async listarPorTicket(idTicket: string): Promise<AnexoTicket[]> {
    const { data, error } = await this.bd
      .from("ticket_attachments")
      .select("*")
      .eq("ticket_id", idTicket)
      .order("created_at", { ascending: true });
    if (error) throw new Error(`[anexosTicket.listarPorTicket] ${error.message}`);
    return (data ?? []) as AnexoTicket[];
  }
}
