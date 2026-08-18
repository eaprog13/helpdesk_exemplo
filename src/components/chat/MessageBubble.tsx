import { clsx } from "clsx";
import type { Mensagem } from "@/core/types";

const rotuloOrigem: Record<string, string> = {
  history: "Já tinha respondido a algo parecido",
  knowledge_base: "Resposta da base de conhecimento da Vértice",
  llm: "Resposta gerada automaticamente — a ser revista por um colaborador",
  ticket_ack: "Nota do ticket",
};

export function BolhaMensagem({ mensagem }: { mensagem: Mensagem }) {
  const ehUtilizador = mensagem.role === "user";

  return (
    <div className={clsx("flex w-full animate-entrada", ehUtilizador ? "justify-end" : "justify-start")}>
      <div className={clsx("flex max-w-[75%] flex-col gap-1", ehUtilizador ? "items-end" : "items-start")}>
        <div
          className={clsx(
            "whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            ehUtilizador ? "bg-ink text-white" : "bg-white text-ink border border-ink-100"
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
