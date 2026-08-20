import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { PedidoRespostaLlm, PedidoHumanizacaoResposta, FornecedorLlm } from "@/core/ports/llm";
import {
  PROMPT_SISTEMA,
  construirPromptUtilizador,
  PROMPT_SISTEMA_HUMANIZACAO,
  construirPromptUtilizadorHumanizacao,
} from "./prompt";

export class FornecedorLlmGemini implements FornecedorLlm {
  private cliente: GoogleGenerativeAI | null = null;

  constructor(private readonly chaveApi: string, private readonly modelo: string) {}

  private obterCliente() {
    if (!this.chaveApi) throw new Error("GEMINI_API_KEY não configurada.");
    if (!this.cliente) this.cliente = new GoogleGenerativeAI(this.chaveApi);
    return this.cliente;
  }

  async gerarResposta(pedido: PedidoRespostaLlm): Promise<string> {
    const cliente = this.obterCliente();
    const modeloGenerativo = cliente.getGenerativeModel({
      model: this.modelo,
      systemInstruction: PROMPT_SISTEMA,
    });

    const resultado = await modeloGenerativo.generateContent(construirPromptUtilizador(pedido));
    const resposta = resultado.response.text();
    if (!resposta) throw new Error("O Gemini não devolveu uma resposta de texto.");
    return resposta.trim();
  }

  async humanizarResposta(pedido: PedidoHumanizacaoResposta): Promise<string> {
    const cliente = this.obterCliente();
    const modeloGenerativo = cliente.getGenerativeModel({
      model: this.modelo,
      systemInstruction: PROMPT_SISTEMA_HUMANIZACAO,
    });

    const resultado = await modeloGenerativo.generateContent(construirPromptUtilizadorHumanizacao(pedido));
    const resposta = resultado.response.text();
    if (!resposta) throw new Error("O Gemini não devolveu uma resposta de texto.");
    return resposta.trim();
  }
}
