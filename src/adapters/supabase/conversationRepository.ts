import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RepositorioConversa } from "@/core/ports/repositories";
import type { Conversa } from "@/core/types";

export class RepositorioConversaSupabase implements RepositorioConversa {
  constructor(private readonly bd: SupabaseClient) {}

  async criar(idCliente: string, assunto: string): Promise<Conversa> {
    const { data, error } = await this.bd
      .from("conversations")
      .insert({ client_id: idCliente, subject: assunto })
      .select("*")
      .single();
    if (error || !data) throw new Error(`[conversas.criar] ${error?.message}`);
    return data;
  }

  async obterPorId(id: string): Promise<Conversa | null> {
    const { data, error } = await this.bd.from("conversations").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`[conversas.obterPorId] ${error.message}`);
    return data;
  }

  async obterMaisRecentePorCliente(idCliente: string): Promise<Conversa | null> {
    const { data, error } = await this.bd
      .from("conversations")
      .select("*")
      .eq("client_id", idCliente)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`[conversas.obterMaisRecentePorCliente] ${error.message}`);
    return data;
  }

  async listarPorCliente(idCliente: string): Promise<Conversa[]> {
    const { data, error } = await this.bd
      .from("conversations")
      .select("*")
      .eq("client_id", idCliente)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`[conversas.listarPorCliente] ${error.message}`);
    return data ?? [];
  }
}
