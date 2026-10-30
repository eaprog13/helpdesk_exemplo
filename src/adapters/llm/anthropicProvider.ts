import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { PedidoRespostaLlm, PedidoHumanizacaoResposta, FornecedorLlm } from "@/core/ports/llm";
import {
  PROMPT_SISTEMA,
  construirPromptUtilizador,
  PROMPT_SISTEMA_HUMANIZACAO,
  construirPromptUtilizadorHumanizacao,
} from "./prompt";

// Os modelos actuais (Claude 4.6 e seguintes) pensam antes de responder, e esse
// raciocínio conta para o max_tokens: o limite tem folga para não cortar a
// resposta. O esforço "low" chega para respostas de apoio ao cliente e mantém
// a latência baixa (exige um modelo que aceite "effort", Claude 4.6 ou mais
// recente).
const MAXIMO_TOKENS = 4096;
const ESFORCO = "low";

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
      max_tokens: MAXIMO_TOKENS,
      output_config: { effort: ESFORCO },
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
      max_tokens: MAXIMO_TOKENS,
      output_config: { effort: ESFORCO },
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
