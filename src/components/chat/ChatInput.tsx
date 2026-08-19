"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Botao } from "@/components/ui/Button";

interface PropriedadesCampoChat {
  valor: string;
  aoAlterar: (valor: string) => void;
  aoSubmeter: () => void;
  desativado?: boolean;
}

// Mensagens por código de erro do SpeechRecognition — a mensagem genérica
// "verifique as permissões" só fazia sentido para "not-allowed"/
// "permission-denied"; para todos os outros códigos (o mais comum sendo
// "network", quando o browser não consegue contactar o serviço de
// reconhecimento) induzia em erro quem já tinha dado a permissão.
const MENSAGENS_ERRO_DITADO: Record<string, string> = {
  "not-allowed": "Permissão de microfone recusada. Ative-a nas definições do site, no browser.",
  "permission-denied": "Permissão de microfone recusada. Ative-a nas definições do site, no browser.",
  "service-not-allowed":
    "O serviço de ditado deste browser recusou o pedido (comum em builds do Chromium sem acesso ao serviço da Google, ou fora de HTTPS/localhost).",
  network:
    "Sem ligação ao serviço de reconhecimento de voz do browser (precisa de internet). Tente novamente ou escreva a pergunta.",
  "audio-capture": "Não foi encontrado nenhum microfone. Verifique se está ligado e não está a ser usado noutro sítio.",
  "no-speech": "Não foi detetada nenhuma fala. Tente falar mais perto do microfone.",
  aborted: "Ditado interrompido.",
};

function mensagemErroDitado(codigo: string): string {
  return MENSAGENS_ERRO_DITADO[codigo] ?? `Não foi possível usar o microfone (erro: ${codigo}).`;
}

/**
 * Input estilo ChatGPT: textarea de altura automática, fixo no fundo da
 * janela de chat, Enter para enviar e Shift+Enter para nova linha, e um
 * botão de ditado por voz (opcional).
 */
export function CampoChat({ valor, aoAlterar, aoSubmeter, desativado }: PropriedadesCampoChat) {
  const refTextarea = useRef<HTMLTextAreaElement>(null);
  const refReconhecimento = useRef<SpeechRecognition | null>(null);
  const refValorAtual = useRef(valor);
  const [suportaDitado, setSuportaDitado] = useState(false);
  const [aOuvir, setAOuvir] = useState(false);
  const [erroDitado, setErroDitado] = useState<string | null>(null);

  refValorAtual.current = valor;

  // API de voz nativa do próprio browser (Web Speech API): o reconhecimento
  // corre no browser/fornecedor do sistema operativo, sem chamar nenhum
  // serviço nosso — por isso não há custo associado. Nem todos os browsers
  // a suportam (Firefox e Safari têm suporte limitado ou nenhum), por isso
  // o botão só aparece quando está mesmo disponível.
  useEffect(() => {
    const construtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    setSuportaDitado(!!construtor);
    return () => {
      refReconhecimento.current?.stop();
    };
  }, []);

  function alternarDitado() {
    const Construtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Construtor) return;

    if (aOuvir) {
      refReconhecimento.current?.stop();
      return;
    }

    setErroDitado(null);
    const reconhecimento = new Construtor();
    reconhecimento.lang = "pt-PT";
    reconhecimento.continuous = true;
    reconhecimento.interimResults = true;

    // Continua a escrever a seguir ao que já lá estava, em vez de substituir.
    const prefixo = refValorAtual.current.trim() ? `${refValorAtual.current.trim()} ` : "";
    let transcricaoConfirmada = "";

    reconhecimento.onresult = (evento) => {
      let parcial = "";
      for (let i = evento.resultIndex; i < evento.results.length; i++) {
        const resultado = evento.results[i];
        const texto = resultado?.[0]?.transcript ?? "";
        if (resultado?.isFinal) {
          transcricaoConfirmada += `${texto} `;
        } else {
          parcial += texto;
        }
      }
      aoAlterar(`${prefixo}${transcricaoConfirmada}${parcial}`);
    };
    reconhecimento.onerror = (evento) => {
      // "aborted" acontece sempre que se chama stop() de propósito (ex.: o
      // próprio botão "parar ditado") — não é um erro real, não mostrar nada.
      if (evento.error !== "aborted") {
        console.error("[ditado por voz] SpeechRecognition error:", evento.error);
        setErroDitado(mensagemErroDitado(evento.error));
      }
      setAOuvir(false);
    };
    reconhecimento.onend = () => setAOuvir(false);

    refReconhecimento.current = reconhecimento;
    try {
      reconhecimento.start();
      setAOuvir(true);
    } catch (erro) {
      console.error("[ditado por voz] não foi possível iniciar:", erro);
      setErroDitado("Não foi possível iniciar o ditado. Tente novamente.");
    }
  }

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
          placeholder={aOuvir ? "A ouvir…" : "Escreva a sua pergunta sobre o seu site ou loja online…"}
          className="max-h-[200px] flex-1 resize-none border-0 bg-transparent px-1.5 py-1.5 text-sm text-ink placeholder:text-ink-300 focus:outline-none focus:ring-0 disabled:opacity-50"
        />
        {suportaDitado && (
          <Botao
            type="button"
            onClick={alternarDitado}
            disabled={desativado}
            variant={aOuvir ? "danger" : "secondary"}
            size="sm"
            className="mb-0.5 shrink-0"
            aria-label={aOuvir ? "Parar ditado por voz" : "Ditar pergunta por voz"}
            title={aOuvir ? "Parar ditado" : "Ditar por voz"}
          >
            {aOuvir ? "⏹" : "🎙️"}
          </Botao>
        )}
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
      {erroDitado && <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-danger">{erroDitado}</p>}
      <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-ink-300">
        As respostas podem ser geradas automaticamente. Casos que exijam intervenção humana são
        sempre encaminhados para a nossa equipa.
      </p>
    </div>
  );
}
