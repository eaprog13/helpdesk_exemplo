import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CorrespondenciaHistoricoCliente, RepositorioMensagem } from "@/core/ports/repositories";
import type { Mensagem } from "@/core/types";

export class RepositorioMensagemSupabase implements RepositorioMensagem {
  constructor(private readonly bd: SupabaseClient) {}

  async criar(dados: Parameters<RepositorioMensagem["criar"]>[0]): Promise<Mensagem> {
    const { data, error } = await this.bd
      .from("messages")
      .insert({
        conversation_id: dados.idConversa,
        role: dados.papel,
        content: dados.conteudo,
        source: dados.origem ?? null,
        kb_reference_id: dados.idReferenciaBaseConhecimento ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(`[mensagens.criar] ${error?.message}`);
    return data;
  }

  async listarPorConversa(idConversa: string): Promise<Mensagem[]> {
    const { data, error } = await this.bd
      .from("messages")
      .select("*")
      .eq("conversation_id", idConversa)
      .order("created_at", { ascending: true });
    if (error) throw new Error(`[mensagens.listarPorConversa] ${error.message}`);
    return data ?? [];
  }

  async pesquisarHistoricoCliente(
    idCliente: string,
    pergunta: string,
    maxResultados: number
  ): Promise<CorrespondenciaHistoricoCliente[]> {
    const { data, error } = await this.bd.rpc("search_client_history", {
      p_client_id: idCliente,
      query_text: pergunta,
      max_results: maxResultados,
    });
    if (error) throw new Error(`[mensagens.pesquisarHistoricoCliente] ${error.message}`);

    type Linha = {
      question_id: string;
      question: string;
      answer: string | null;
      conversation_id: string;
      rank: number;
    };

    return ((data ?? []) as Linha[]).map((linha) => ({
      idPergunta: linha.question_id,
      pergunta: linha.question,
      resposta: linha.answer,
      idConversa: linha.conversation_id,
      relevancia: linha.rank,
    }));
  }
}
