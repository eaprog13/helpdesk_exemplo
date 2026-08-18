// Ports (contratos) de acesso a dados. O núcleo do negócio (core/services)
// depende apenas destas interfaces — nunca de um SDK de base de dados
// concreto. Para trocar de base de dados (ex.: Supabase → Postgres direto,
// PlanetScale, Firebase, MongoDB…), escreve-se uma nova implementação de
// cada interface em src/adapters/<novo-fornecedor>/ e liga-se em
// src/composition/container.ts — nada em core/ ou nas rotas muda.

import type {
  Conversa,
  EntradaBaseConhecimento,
  Mensagem,
  OrigemMensagem,
  Perfil,
  TipoSite,
  Ticket,
  PrioridadeTicket,
  EstadoTicket,
  AtualizacaoTicket,
  CanalNotificacao,
  EventoNotificacao,
  EstadoNotificacao,
} from "@/core/types";

export interface RepositorioPerfil {
  obterPorId(id: string): Promise<Perfil | null>;
  atualizar(id: string, alteracoes: Partial<Perfil>): Promise<void>;
  listarClientes(): Promise<Perfil[]>;
}

export interface RepositorioConversa {
  criar(idCliente: string, assunto: string): Promise<Conversa>;
  obterPorId(id: string): Promise<Conversa | null>;
  obterMaisRecentePorCliente(idCliente: string): Promise<Conversa | null>;
  /** Todas as conversas de um cliente, mais recente primeiro — para o separador de histórico. */
  listarPorCliente(idCliente: string): Promise<Conversa[]>;
}

export interface CorrespondenciaHistoricoCliente {
  idPergunta: string;
  pergunta: string;
  /** Resposta que foi dada a essa pergunta anterior, se existir (a conversa pode não ter sido respondida ainda). */
  resposta: string | null;
  idConversa: string;
  relevancia: number;
}

export interface RepositorioMensagem {
  criar(dados: {
    idConversa: string;
    papel: "user" | "assistant" | "system";
    conteudo: string;
    origem?: OrigemMensagem | null;
    idReferenciaBaseConhecimento?: string | null;
  }): Promise<Mensagem>;
  listarPorConversa(idConversa: string): Promise<Mensagem[]>;
  /**
   * Pesquisa por perguntas semelhantes já feitas por este cliente no passado
   * (e a respetiva resposta) — a primeira camada de contexto verificada
   * antes da base de conhecimento e da LLM.
   */
  pesquisarHistoricoCliente(
    idCliente: string,
    pergunta: string,
    maxResultados: number
  ): Promise<CorrespondenciaHistoricoCliente[]>;
}

export interface CorrespondenciaBaseConhecimento extends EntradaBaseConhecimento {
  rank: number;
}

export interface RepositorioBaseConhecimento {
  /** Pesquisa por relevância no conteúdo publicado, filtrando por tipo de site quando indicado. */
  pesquisar(
    pergunta: string,
    tipoSite: TipoSite | null,
    maxResultados: number
  ): Promise<CorrespondenciaBaseConhecimento[]>;
  listar(): Promise<EntradaBaseConhecimento[]>;
  criar(entrada: {
    titulo: string;
    conteudo: string;
    tipoSite: TipoSite;
    etiquetas: string[];
    publicado: boolean;
    criadoPor: string;
  }): Promise<EntradaBaseConhecimento>;
  atualizar(
    id: string,
    alteracoes: Partial<{
      titulo: string;
      conteudo: string;
      tipoSite: TipoSite;
      etiquetas: string[];
      publicado: boolean;
    }>
  ): Promise<EntradaBaseConhecimento | null>;
  remover(id: string): Promise<void>;
}

export interface RepositorioTicket {
  criar(dados: {
    idConversa: string;
    idMensagem: string | null;
    idCliente: string;
    titulo: string;
    pergunta: string;
    respostaLlm: string | null;
  }): Promise<Ticket>;
  obterPorId(id: string): Promise<Ticket | null>;
  atualizar(
    id: string,
    alteracoes: Partial<{
      estado: EstadoTicket;
      prioridade: PrioridadeTicket;
      idDevAtribuido: string | null;
      dataResolucao: string | null;
    }>
  ): Promise<Ticket | null>;
  listarPorCliente(idCliente: string): Promise<Ticket[]>;
  listarTodos(): Promise<Ticket[]>;
}

export interface RepositorioAtualizacaoTicket {
  criar(dados: {
    idTicket: string;
    idAutor: string;
    nota: string;
    visivelParaCliente: boolean;
  }): Promise<AtualizacaoTicket>;
  listarPorTicket(idTicket: string, opcoes?: { apenasVisivelParaCliente?: boolean }): Promise<AtualizacaoTicket[]>;
}

export interface RepositorioRegistoNotificacao {
  registar(entrada: {
    idCliente: string;
    idTicket: string | null;
    canal: CanalNotificacao;
    evento: EventoNotificacao;
    estado: EstadoNotificacao;
    erro: string | null;
  }): Promise<void>;
}
