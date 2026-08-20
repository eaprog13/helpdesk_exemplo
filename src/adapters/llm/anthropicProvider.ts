import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { PedidoRespostaLlm, PedidoHumanizacaoResposta, FornecedorLlm } from "@/core/ports/llm";
import {
  PROMPT_SISTEMA,
  construirPromptUtilizador,
  PROMPT_SISTEMA_HUMANIZACAO,
  construirPromptUtilizadorHumanizacao,
} from "./prompt";

export class FornecedorLlmAnthropic implements FornecedorLlm {
  private cliente: Anthropic | null = null;

  constructor(private readonly chaveApi: string, private readonly modelo: string) {}

  private obterCliente() {
    if (!this.chaveApi) throw new Error("ANTHROPIC_API_KEY não configurada.");
    if (!this.cliente) this.cliente = new Anthropic({ apiKey: this.chaveApi });
    return this.cliente;
  }

  async gerarResposta(pedido: PedidoRespostaLlm): Promise<string> {
    const cliente = this.obterCliente();
    const mensagem = await cliente.messages.create({
      model: this.modelo,
      max_tokens: 1024,
      system: PROMPT_SISTEMA,
      messages: [{ role: "user", content: construirPromptUtilizador(pedido) }],
    });

    const blocoTexto = mensagem.content.find((bloco) => bloco.type === "text");
    if (!blocoTexto || blocoTexto.type !== "text") {
      throw new Error("A Anthropic não devolveu uma resposta de texto.");
    }
    return blocoTexto.text.trim();
  }

  async humanizarResposta(pedido: PedidoHumanizacaoResposta): Promise<string> {
    const cliente = this.obterCliente();
    const mensagem = await cliente.messages.create({
      model: this.modelo,
      max_tokens: 1024,
      system: PROMPT_SISTEMA_HUMANIZACAO,
      messages: [{ role: "user", content: construirPromptUtilizadorHumanizacao(pedido) }],
    });

    const blocoTexto = mensagem.content.find((bloco) => bloco.type === "text");
    if (!blocoTexto || blocoTexto.type !== "text") {
      throw new Error("A Anthropic não devolveu uma resposta de texto.");
    }
    return blocoTexto.text.trim();
  }
}
