import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FicheiroParaCarregar, RepositorioArmazenamento } from "@/core/ports/storage";

const BALDE_LOGOS = "logos";

/**
 * Implementa RepositorioArmazenamento sobre o Supabase Storage. Um só
 * ficheiro por cliente (nome fixo "logo.<extensão>", com upsert) — um
 * upload novo substitui sempre o anterior, sem acumular lixo no bucket.
 */
export class RepositorioArmazenamentoSupabase implements RepositorioArmazenamento {
  constructor(private readonly bd: SupabaseClient) {}

  async carregarLogotipoCliente(idCliente: string, ficheiro: FicheiroParaCarregar): Promise<string> {
    const caminho = `${idCliente}/logo.${ficheiro.extensao}`;

    const { error } = await this.bd.storage.from(BALDE_LOGOS).upload(caminho, ficheiro.conteudo, {
      contentType: ficheiro.tipoConteudo,
      upsert: true,
    });
    if (error) throw new Error(`[armazenamento.carregarLogotipoCliente] ${error.message}`);

    const { data } = this.bd.storage.from(BALDE_LOGOS).getPublicUrl(caminho);
    // Adiciona um parâmetro de cache-busting (baseado na hora atual) para
    // que trocar o logótipo se reflita de imediato — sem isto, o browser
    // podia continuar a mostrar a imagem antiga em cache com o mesmo URL.
    return `${data.publicUrl}?v=${Date.now()}`;
  }
}
