"use client";

import { useEffect, useRef, useState } from "react";
import { BolhaMensagem } from "./MessageBubble";
import { IndicadorEscrita } from "./TypingIndicator";
import { AvisoTicket } from "./TicketBanner";
import { CampoChat } from "./ChatInput";
import { CartoesSugestoesRapidas } from "./QuickActionCards";
import type { ResultadoPergunta, Mensagem, Ticket } from "@/core/types";

export function JanelaChat({ nomeCompleto }: { nomeCompleto?: string }) {
  const primeiroNome = nomeCompleto?.trim().split(/\s+/)[0];
  const [idConversa, setIdConversa] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [ticketRecente, setTicketRecente] = useState<Ticket | null>(null);
  const [entrada, setEntrada] = useState("");
  const [aEnviar, setAEnviar] = useState(false);
  const [aCarregarHistorico, setACarregarHistorico] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const refFundo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const resposta = await fetch("/api/chat");
        if (!resposta.ok) return;
        const corpo = await resposta.json();
        if (cancelado) return;
        setIdConversa(corpo.idConversa);
        setMensagens(corpo.mensagens ?? []);
      } finally {
        if (!cancelado) setACarregarHistorico(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    refFundo.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens, aEnviar]);

  async function submeterPergunta() {
    const pergunta = entrada.trim();
    if (!pergunta || aEnviar) return;

    setErro(null);
    setEntrada("");
    setAEnviar(true);

    // Mostra a mensagem do utilizador de imediato (UI otimista).
    const mensagemOtimista: Mensagem = {
      id: `otimista-${Date.now()}`,
      conversation_id: idConversa ?? "",
      role: "user",
      content: pergunta,
      source: null,
      kb_reference_id: null,
      created_at: new Date().toISOString(),
    };
    setMensagens((anteriores) => [...anteriores, mensagemOtimista]);

    try {
      const resposta = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idConversa, pergunta }),
      });
      const corpo = await resposta.json();

      if (!resposta.ok) {
        setErro(corpo.error ?? "Ocorreu um erro. Tente novamente.");
        setMensagens((anteriores) => anteriores.filter((m) => m.id !== mensagemOtimista.id));
        return;
      }

      const resultado = corpo as ResultadoPergunta;
      setIdConversa(resultado.idConversa);
      setMensagens((anteriores) => [
        ...anteriores.filter((m) => m.id !== mensagemOtimista.id),
        resultado.mensagemUtilizador,
        resultado.mensagemResposta,
      ]);
      setTicketRecente(resultado.ticket);
    } catch {
      setErro("Não foi possível ligar ao servidor. Verifique a sua ligação.");
      setMensagens((anteriores) => anteriores.filter((m) => m.id !== mensagemOtimista.id));
    } finally {
      setAEnviar(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-6">
          {aCarregarHistorico && <p className="text-center text-sm text-ink-300">A carregar conversa…</p>}

          {!aCarregarHistorico && mensagens.length === 0 && (
            <div className="animate-entrada mt-16 text-center">
              <h2 className="text-lg font-semibold text-ink">
                {primeiroNome ? `Como podemos ajudar, ${primeiroNome}?` : "Como podemos ajudar?"}
              </h2>
              <p className="mt-1 text-sm text-ink-400">
                Pergunte-nos algo sobre o seu site institucional ou loja online.
              </p>
              <CartoesSugestoesRapidas aoEscolher={setEntrada} />
            </div>
          )}

          {mensagens.map((mensagem) => (
            <BolhaMensagem key={mensagem.id} mensagem={mensagem} />
          ))}

          {aEnviar && <IndicadorEscrita />}

          {ticketRecente && <AvisoTicket ticket={ticketRecente} />}

          {erro && (
            <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-center text-sm text-danger">
              {erro}
            </p>
          )}

          <div ref={refFundo} />
        </div>
      </div>

      <CampoChat valor={entrada} aoAlterar={setEntrada} aoSubmeter={submeterPergunta} desativado={aEnviar} />
    </div>
  );
}
