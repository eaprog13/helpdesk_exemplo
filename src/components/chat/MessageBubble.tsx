import { clsx } from "clsx";
import type { Mensagem } from "@/core/types";

const rotuloOrigem: Record<string, string> = {
  history: "Já tinha respondido a algo parecido",
  knowledge_base: "Resposta da base de conhecimento da Vértice Digital",
  // Resposta nova, fundamentada nos excertos da KB (mesmo que nenhum
  // sozinho fosse confiante) — nunca no conhecimento geral da LLM sobre
  // factos da Vértice Digital (ver PROMPT_SISTEMA em adapters/llm/prompt.ts
  // e gerarResposta em core/services/chatService.ts).
  llm: "Resposta gerada automaticamente — a ser revista por um colaborador",
  ticket_ack: "Encaminhámos o seu pedido para a nossa equipa",
};

export function BolhaMensagem({ mensagem }: { mensagem: Mensagem }) {
  const ehUtilizador = mensagem.role === "user";

  return (
    <div className={clsx("flex w-full animate-entrada", ehUtilizador ? "justify-end" : "justify-start")}>
      <div className={clsx("flex max-w-[75%] flex-col gap-1", ehUtilizador ? "items-end" : "items-start")}>
        <div
          className={clsx(
            "whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            // "Rabo" da bolha (canto mais fechado do lado de quem fala) —
            // ver identidade visual: lê melhor como conversa do que um
            // retângulo simétrico.
            ehUtilizador ? "rounded-br-md bg-ink text-white" : "rounded-bl-md border border-ink-100 bg-white text-ink"
          )}
        >
          {mensagem.content}
        </div>
        {!ehUtilizador && mensagem.source && (
          <span className="px-1 text-[11px] text-ink-300">{rotuloOrigem[mensagem.source]}</span>
        )}
      </div>
    </div>
  );
}
