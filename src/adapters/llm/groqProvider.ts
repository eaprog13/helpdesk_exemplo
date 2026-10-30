import "server-only";
import OpenAI from "openai";
import type { PedidoRespostaLlm, PedidoHumanizacaoResposta, FornecedorLlm } from "@/core/ports/llm";
import {
  PROMPT_SISTEMA,
  construirPromptUtilizador,
  PROMPT_SISTEMA_HUMANIZACAO,
  construirPromptUtilizadorHumanizacao,
} from "./prompt";

// A GroqCloud expõe uma API compatível com a da OpenAI (mesmo formato de
// pedido/resposta em /chat/completions) — por isso reutiliza-se o SDK
// "openai" já uma dependência do projeto, só a apontar para outro
// endpoint, em vez de adicionar mais um SDK só para isto. Ver
// https://console.groq.com/docs/openai — "OpenAI Compatibility".
const URL_BASE_GROQ = "https://api.groq.com/openai/v1";

// max_completion_tokens substitui o max_tokens (que os modelos de raciocínio
// recusam) e conta também os tokens de raciocínio: daí a folga no limite.
const MAXIMO_TOKENS = 4096;

export class FornecedorLlmGroq implements FornecedorLlm {
  private cliente: OpenAI | null = null;

  constructor(private readonly chaveApi: string, private readonly modelo: string) {}

  private obterCliente() {
    if (!this.chaveApi) throw new Error("GROQ_API_KEY não configurada.");
    if (!this.cliente) this.cliente = new OpenAI({ apiKey: this.chaveApi, baseURL: URL_BASE_GROQ });
    return this.cliente;
  }

  async gerarResposta(pedido: PedidoRespostaLlm): Promise<string> {
    const cliente = this.obterCliente();
    const conclusao = await cliente.chat.completions.create({
      model: this.modelo,
      max_completion_tokens: MAXIMO_TOKENS,
      messages: [
        { role: "system", content: PROMPT_SISTEMA },
        { role: "user", content: construirPromptUtilizador(pedido) },
      ],
    });

    const resposta = conclusao.choices[0]?.message?.content;
    if (!resposta) throw new Error("A Groq não devolveu uma resposta de texto.");
    return resposta.trim();
  }

  async humanizarResposta(pedido: PedidoHumanizacaoResposta): Promise<string> {
    const cliente = this.obterCliente();
    const conclusao = await cliente.chat.completions.create({
      model: this.modelo,
      max_completion_tokens: MAXIMO_TOKENS,
      messages: [
        { role: "system", content: PROMPT_SISTEMA_HUMANIZACAO },
        { role: "user", content: construirPromptUtilizadorHumanizacao(pedido) },
      ],
    });

    const resposta = conclusao.choices[0]?.message?.content;
    if (!resposta) throw new Error("A Groq não devolveu uma resposta de texto.");
    return resposta.trim();
  }
}
