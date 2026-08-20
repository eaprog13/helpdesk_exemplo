// Port do fornecedor de LLM. O core só conhece esta interface — troca-se de
// Anthropic para OpenAI, Gemini, um modelo self-hosted, etc. escrevendo um
// novo adaptador em src/adapters/llm/ que a implemente.

export interface PedidoRespostaLlm {
  pergunta: string;
  /** Excertos da base de conhecimento relacionados, mesmo que insuficientes por si só. */
  contextoRelacionado: { titulo: string; conteudo: string }[];
  nomeEmpresa?: string | null;
  /** Tipo(s) de produto do cliente (ver TipoSite em core/types.ts) — [] = não especificado. */
  tiposSite?: string[];
}

export interface PedidoHumanizacaoResposta {
  pergunta: string;
  /** Resposta já correta e aprovada (histórico do cliente ou base de conhecimento) — só precisa de soar mais natural para esta pergunta em concreto. */
  respostaBase: string;
  nomeEmpresa?: string | null;
}

export interface FornecedorLlm {
  gerarResposta(pedido: PedidoRespostaLlm): Promise<string>;
  /**
   * Reescreve uma resposta já correta (do histórico ou da base de
   * conhecimento) para soar mais natural à pergunta concreta que foi
   * feita — sem acrescentar, remover ou alterar nenhum facto. Usado por
   * core/services/chatService.ts só quando Dependencias.respostaHumanizadaAtiva
   * é true (ver RESPOSTA_HUMANIZADA_ATIVA no .env — desligado por
   * omissão, ainda em validação).
   */
  humanizarResposta(pedido: PedidoHumanizacaoResposta): Promise<string>;
}
