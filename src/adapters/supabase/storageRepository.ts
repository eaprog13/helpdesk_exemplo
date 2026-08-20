import "server-only";
import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FicheiroParaCarregar, RepositorioArmazenamento } from "@/core/ports/storage";

const BALDE_LOGOS = "logos";
const BALDE_ANEXOS_TICKET = "ticket-attachments";
// Bucket privado — o URL assinado expira, para não ficar acessível para
// sempre a quem alguma vez o tenha visto (ex.: copiado para um email).
const VALIDADE_URL_ANEXO_SEGUNDOS = 60 * 60; // 1 hora

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

  async carregarAnexoTicket(idTicket: string, ficheiro: FicheiroParaCarregar): Promise<string> {
    // Nome aleatório (não upsert): ao contrário do logótipo, um ticket pode
    // ter vários anexos — um novo upload nunca deve substituir o anterior.
    const caminho = `${idTicket}/${randomUUID()}.${ficheiro.extensao}`;

    const { error } = await this.bd.storage.from(BALDE_ANEXOS_TICKET).upload(caminho, ficheiro.conteudo, {
      contentType: ficheiro.tipoConteudo,
    });
    if (error) throw new Error(`[armazenamento.carregarAnexoTicket] ${error.message}`);

    return caminho;
  }

  async obterUrlAnexoTicket(caminho: string): Promise<string> {
    const { data, error } = await this.bd.storage
      .from(BALDE_ANEXOS_TICKET)
      .createSignedUrl(caminho, VALIDADE_URL_ANEXO_SEGUNDOS);
    if (error || !data) {
      throw new Error(`[armazenamento.obterUrlAnexoTicket] ${error?.message ?? "URL assinado não gerado."}`);
    }
    return data.signedUrl;
  }
}
