import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RepositorioTicket } from "@/core/ports/repositories";
import type { Ticket } from "@/core/types";

export class RepositorioTicketSupabase implements RepositorioTicket {
  constructor(private readonly bd: SupabaseClient) {}

  async criar(dados: Parameters<RepositorioTicket["criar"]>[0]): Promise<Ticket> {
    const { data, error } = await this.bd
      .from("tickets")
      .insert({
        conversation_id: dados.idConversa,
        message_id: dados.idMensagem,
        client_id: dados.idCliente,
        title: dados.titulo,
        question: dados.pergunta,
        llm_answer: dados.respostaLlm,
        status: "open",
        priority: "normal",
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(`[tickets.criar] ${error?.message}`);
    return data;
  }

  async obterPorId(id: string): Promise<Ticket | null> {
    const { data, error } = await this.bd.from("tickets").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`[tickets.obterPorId] ${error.message}`);
    return data;
  }

  async atualizar(id: string, alteracoes: Parameters<RepositorioTicket["atualizar"]>[1]): Promise<Ticket | null> {
    const payload: Record<string, unknown> = {};
    if (alteracoes.estado !== undefined) payload.status = alteracoes.estado;
    if (alteracoes.prioridade !== undefined) payload.priority = alteracoes.prioridade;
    if (alteracoes.idDevAtribuido !== undefined) payload.assigned_dev_id = alteracoes.idDevAtribuido;
    if (alteracoes.dataResolucao !== undefined) payload.resolved_at = alteracoes.dataResolucao;

    const { data, error } = await this.bd
      .from("tickets")
      .update(payload)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(`[tickets.atualizar] ${error.message}`);
    return data;
  }

  async listarPorCliente(idCliente: string): Promise<Ticket[]> {
    const { data, error } = await this.bd
      .from("tickets")
      .select("*")
      .eq("client_id", idCliente)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`[tickets.listarPorCliente] ${error.message}`);
    return data ?? [];
  }

  async listarTodos(): Promise<Ticket[]> {
    const { data, error } = await this.bd
      .from("tickets")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(`[tickets.listarTodos] ${error.message}`);
    return data ?? [];
  }
}
