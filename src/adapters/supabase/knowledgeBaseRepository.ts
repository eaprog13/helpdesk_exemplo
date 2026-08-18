import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CorrespondenciaBaseConhecimento, RepositorioBaseConhecimento } from "@/core/ports/repositories";
import type { EntradaBaseConhecimento, TipoSite } from "@/core/types";

/**
 * Pesquisa full-text (Postgres tsvector, dicionário "portuguese") na base de
 * conhecimento — o "contexto do site da Vértice" mencionado no pedido do
 * cliente. A função search_knowledge_base (supabase/schema.sql) faz o
 * ranking; a decisão de "é suficientemente relevante?" é regra de negócio e
 * vive em core/services/chatService.ts, não aqui.
 */
export class RepositorioBaseConhecimentoSupabase implements RepositorioBaseConhecimento {
  constructor(private readonly bd: SupabaseClient) {}

  async pesquisar(
    pergunta: string,
    tipoSite: TipoSite | null,
    maxResultados: number
  ): Promise<CorrespondenciaBaseConhecimento[]> {
    const { data, error } = await this.bd.rpc("search_knowledge_base", {
      query_text: pergunta,
      filter_site_type: tipoSite ?? null,
      max_results: maxResultados,
    });
    if (error) throw new Error(`[baseConhecimento.pesquisar] ${error.message}`);
    return data ?? [];
  }

  async listar(): Promise<EntradaBaseConhecimento[]> {
    const { data, error } = await this.bd
      .from("knowledge_base")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(`[baseConhecimento.listar] ${error.message}`);
    return data ?? [];
  }

  async criar(entrada: Parameters<RepositorioBaseConhecimento["criar"]>[0]): Promise<EntradaBaseConhecimento> {
    const { data, error } = await this.bd
      .from("knowledge_base")
      .insert({
        title: entrada.titulo,
        content: entrada.conteudo,
        site_type: entrada.tipoSite,
        tags: entrada.etiquetas,
        is_published: entrada.publicado,
        created_by: entrada.criadoPor,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(`[baseConhecimento.criar] ${error?.message}`);
    return data;
  }

  async atualizar(
    id: string,
    alteracoes: Parameters<RepositorioBaseConhecimento["atualizar"]>[1]
  ): Promise<EntradaBaseConhecimento | null> {
    const payload: Record<string, unknown> = {};
    if (alteracoes.titulo !== undefined) payload.title = alteracoes.titulo;
    if (alteracoes.conteudo !== undefined) payload.content = alteracoes.conteudo;
    if (alteracoes.tipoSite !== undefined) payload.site_type = alteracoes.tipoSite;
    if (alteracoes.etiquetas !== undefined) payload.tags = alteracoes.etiquetas;
    if (alteracoes.publicado !== undefined) payload.is_published = alteracoes.publicado;

    const { data, error } = await this.bd
      .from("knowledge_base")
      .update(payload)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(`[baseConhecimento.atualizar] ${error.message}`);
    return data;
  }

  async remover(id: string): Promise<void> {
    const { error } = await this.bd.from("knowledge_base").delete().eq("id", id);
    if (error) throw new Error(`[baseConhecimento.remover] ${error.message}`);
  }
}
