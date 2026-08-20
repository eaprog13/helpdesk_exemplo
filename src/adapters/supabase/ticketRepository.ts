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
        department: dados.departamento ?? null,
        assigned_dev_id: dados.idDevAtribuido ?? null,
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
    if (alteracoes.departamento !== undefined) payload.department = alteracoes.departamento;
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

  async obterCargaTrabalhoPorDev(
    idsDevs: string[]
  ): Promise<Record<string, { ativos: number; ultimaAtribuicaoEm: string | null }>> {
    const carga: Record<string, { ativos: number; ultimaAtribuicaoEm: string | null }> = Object.fromEntries(
      idsDevs.map((id) => [id, { ativos: 0, ultimaAtribuicaoEm: null }])
    );
    if (idsDevs.length === 0) return carga;

    // Uma só consulta com tudo o que é preciso: "status" para contar só os
    // ativos, "created_at" (de QUALQUER estado) para saber há quanto tempo
    // cada dev não recebe um ticket novo — usado só para desempate, não
    // para a contagem de carga em si.
    const { data, error } = await this.bd
      .from("tickets")
      .select("assigned_dev_id, status, created_at")
      .in("assigned_dev_id", idsDevs)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`[tickets.obterCargaTrabalhoPorDev] ${error.message}`);

    for (const linha of data ?? []) {
      const id = linha.assigned_dev_id as string | null;
      // A consulta já filtrou "in idsDevs" — mas idsDevs pode incluir um id
      // que, por alguma razão, não tinha entrada em "carga" (não devia
      // acontecer; a verificação é só para agradar ao noUncheckedIndexedAccess).
      const cargaDev = id ? carga[id] : undefined;
      if (!id || !cargaDev) continue;
      if (linha.status === "open" || linha.status === "in_progress") cargaDev.ativos += 1;
      // A primeira linha de cada dev que aparece é a mais recente (ordenado
      // desc acima) — as seguintes já não devem sobrepor-se a ela.
      if (!cargaDev.ultimaAtribuicaoEm) cargaDev.ultimaAtribuicaoEm = linha.created_at;
    }
    return carga;
  }
}
