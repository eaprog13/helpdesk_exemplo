"use client";

import { useRef, type KeyboardEvent } from "react";
import { Botao } from "@/components/ui/Button";

interface PropriedadesCampoChat {
  valor: string;
  aoAlterar: (valor: string) => void;
  aoSubmeter: () => void;
  desativado?: boolean;
}

/**
 * Input estilo ChatGPT: textarea de altura automática, fixo no fundo da
 * janela de chat, Enter para enviar e Shift+Enter para nova linha.
 */
export function CampoChat({ valor, aoAlterar, aoSubmeter, desativado }: PropriedadesCampoChat) {
  const refTextarea = useRef<HTMLTextAreaElement>(null);

  function aoEscrever(e: React.ChangeEvent<HTMLTextAreaElement>) {
    aoAlterar(e.target.value);
    const elemento = refTextarea.current;
    if (elemento) {
      elemento.style.height = "auto";
      elemento.style.height = `${Math.min(elemento.scrollHeight, 200)}px`;
    }
  }

  function aoPressionarTecla(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (valor.trim() && !desativado) aoSubmeter();
    }
  }

  return (
    <div className="border-t border-ink-100 bg-surface px-6 py-4">
      <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-ink-100 bg-white px-3 py-2 shadow-panel focus-within:ring-2 focus-within:ring-accent">
        <textarea
          ref={refTextarea}
          rows={1}
          value={valor}
          onChange={aoEscrever}
          onKeyDown={aoPressionarTecla}
          disabled={desativado}
          placeholder="Escreva a sua pergunta sobre o seu site ou loja online…"
          className="max-h-[200px] flex-1 resize-none border-0 bg-transparent px-1.5 py-1.5 text-sm text-ink placeholder:text-ink-300 focus:outline-none focus:ring-0 disabled:opacity-50"
        />
        <Botao
          onClick={aoSubmeter}
          disabled={desativado || !valor.trim()}
          size="sm"
          className="mb-0.5 shrink-0"
          aria-label="Enviar pergunta"
        >
          Enviar
        </Botao>
      </div>
      <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-ink-300">
        As respostas podem ser geradas automaticamente. Casos que exijam intervenção humana são
        sempre encaminhados para a nossa equipa.
      </p>
    </div>
  );
}
