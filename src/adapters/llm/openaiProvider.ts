import "server-only";
import OpenAI from "openai";
import type { PedidoRespostaLlm, FornecedorLlm } from "@/core/ports/llm";
import { PROMPT_SISTEMA, construirPromptUtilizador } from "./prompt";

export class FornecedorLlmOpenAi implements FornecedorLlm {
  private cliente: OpenAI | null = null;

  constructor(private readonly chaveApi: string, private readonly modelo: string) {}

  private obterCliente() {
    if (!this.chaveApi) throw new Error("OPENAI_API_KEY não configurada.");
    if (!this.cliente) this.cliente = new OpenAI({ apiKey: this.chaveApi });
    return this.cliente;
  }

  async gerarResposta(pedido: PedidoRespostaLlm): Promise<string> {
    const cliente = this.obterCliente();
    const conclusao = await cliente.chat.completions.create({
      model: this.modelo,
      max_tokens: 1024,
      messages: [
        { role: "system", content: PROMPT_SISTEMA },
        { role: "user", content: construirPromptUtilizador(pedido) },
      ],
    });

    const resposta = conclusao.choices[0]?.message?.content;
    if (!resposta) throw new Error("A OpenAI não devolveu uma resposta de texto.");
    return resposta.trim();
  }
}
