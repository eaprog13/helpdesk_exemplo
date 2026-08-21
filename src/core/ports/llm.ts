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
  /**
   * Gera uma resposta NOVA, mas fundamentada apenas no `contextoRelacionado`
   * fornecido (excertos reais da base de conhecimento, mesmo que nenhum
   * sozinho seja confiante) — nunca no conhecimento geral da LLM sobre
   * factos específicos da Vértice Digital (ver PROMPT_SISTEMA em
   * adapters/llm/prompt.ts: proíbe explicitamente inventar preços, prazos
   * ou procedimentos que não estejam no contexto). Chamada por
   * core/services/chatService.ts (fazerPergunta) quando não há resposta
   * confiante no histórico nem um artigo único confiante na KB, até
   * MAX_TENTATIVAS_LLM_SEGUIDAS vezes seguidas na mesma conversa — depois
   * disso, cai para abrir ticket em vez de continuar a tentar.
   */
  gerarResposta(pedido: PedidoRespostaLlm): Promise<string>;
  /**
   * Reescreve uma resposta já correta e conhecida (histórico, base de
   * conhecimento, saudação fixa, aviso de ticket aberto) para soar mais
   * natural à pergunta concreta que foi feita — sem acrescentar, remover
   * ou alterar nenhum facto (ao contrário de gerarResposta, não cria
   * conteúdo novo, só reescreve o que já existe). Usado sempre que
   * Dependencias.respostaHumanizadaAtiva é true (RESPOSTA_HUMANIZADA_ATIVA
   * no .env — ativo por omissão; false só como interruptor de emergência).
   */
  humanizarResposta(pedido: PedidoHumanizacaoResposta): Promise<string>;
}
