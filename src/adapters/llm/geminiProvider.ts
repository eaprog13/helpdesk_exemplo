import "server-only";
import { GoogleGenAI } from "@google/genai";
import type { PedidoRespostaLlm, PedidoHumanizacaoResposta, FornecedorLlm } from "@/core/ports/llm";
import {
  PROMPT_SISTEMA,
  construirPromptUtilizador,
  PROMPT_SISTEMA_HUMANIZACAO,
  construirPromptUtilizadorHumanizacao,
} from "./prompt";

export class FornecedorLlmGemini implements FornecedorLlm {
  private cliente: GoogleGenAI | null = null;

  constructor(private readonly chaveApi: string, private readonly modelo: string) {}

  private obterCliente() {
    if (!this.chaveApi) throw new Error("GEMINI_API_KEY não configurada.");
    if (!this.cliente) this.cliente = new GoogleGenAI({ apiKey: this.chaveApi });
    return this.cliente;
  }

  async gerarResposta(pedido: PedidoRespostaLlm): Promise<string> {
    const cliente = this.obterCliente();
    const resultado = await cliente.models.generateContent({
      model: this.modelo,
      contents: construirPromptUtilizador(pedido),
      config: { systemInstruction: PROMPT_SISTEMA },
    });

    const resposta = resultado.text;
    if (!resposta) throw new Error("O Gemini não devolveu uma resposta de texto.");
    return resposta.trim();
  }

  async humanizarResposta(pedido: PedidoHumanizacaoResposta): Promise<string> {
    const cliente = this.obterCliente();
    const resultado = await cliente.models.generateContent({
      model: this.modelo,
      contents: construirPromptUtilizadorHumanizacao(pedido),
      config: { systemInstruction: PROMPT_SISTEMA_HUMANIZACAO },
    });

    const resposta = resultado.text;
    if (!resposta) throw new Error("O Gemini não devolveu uma resposta de texto.");
    return resposta.trim();
  }
}
