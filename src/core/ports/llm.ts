// Port do fornecedor de LLM. O core só conhece esta interface — troca-se de
// Anthropic para OpenAI, Gemini, um modelo self-hosted, etc. escrevendo um
// novo adaptador em src/adapters/llm/ que a implemente.

export interface PedidoRespostaLlm {
  pergunta: string;
  /** Excertos da base de conhecimento relacionados, mesmo que insuficientes por si só. */
  contextoRelacionado: { titulo: string; conteudo: string }[];
  nomeEmpresa?: string | null;
  tipoSite?: string | null;
}

export interface FornecedorLlm {
  gerarResposta(pedido: PedidoRespostaLlm): Promise<string>;
}
