import type { Dependencias } from "@/core/deps";
import type { TipoSite } from "@/core/types";

/** Já existe uma entrada da Base de Conhecimento com este título (índice único em `title`). */
export class TituloDuplicadoError extends Error {}

export async function listarBaseConhecimento(dependencias: Dependencias) {
  return dependencias.baseConhecimento.listar();
}

export async function criarEntradaBaseConhecimento(
  dependencias: Dependencias,
  idAutor: string,
  dados: { titulo: string; conteudo: string; tipoSite: TipoSite; etiquetas: string[]; publicado: boolean }
) {
  return dependencias.baseConhecimento.criar({ ...dados, criadoPor: idAutor });
}

export async function atualizarEntradaBaseConhecimento(
  dependencias: Dependencias,
  id: string,
  alteracoes: Partial<{ titulo: string; conteudo: string; tipoSite: TipoSite; etiquetas: string[]; publicado: boolean }>
) {
  return dependencias.baseConhecimento.atualizar(id, alteracoes);
}

export async function apagarEntradaBaseConhecimento(dependencias: Dependencias, id: string) {
  return dependencias.baseConhecimento.remover(id);
}
