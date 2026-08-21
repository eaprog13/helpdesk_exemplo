"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Cartao } from "@/components/ui/Card";
import { Botao } from "@/components/ui/Button";
import { VerificacaoAnimada } from "@/components/ui/SuccessCheck";

/**
 * O passo do cliente no fluxo do ticket (ver o comentário sobre o fluxo em
 * core/services/ticketService.ts): só aparece quando o ticket está
 * "resolved" — ou confirma (fecha o ticket) ou explica o que ainda falta
 * (o ticket volta para "em resolução" com essa nota, para o mesmo dev).
 */
export function AcoesTicketCliente({ idTicket }: { idTicket: string }) {
  const router = useRouter();
  const [nota, setNota] = useState("");
  const [mostrarReabrir, setMostrarReabrir] = useState(false);
  const [aEnviar, setAEnviar] = useState<"fechar" | "reabrir" | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(acao: "fechar" | "reabrir") {
    if (acao === "reabrir" && !nota.trim()) {
      setErro("Descreva o que ainda falta antes de reabrir o pedido.");
      return;
    }
    setAEnviar(acao);
    setErro(null);
    const resposta = await fetch(`/api/tickets/${idTicket}/resposta-cliente`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao, nota: nota.trim() || undefined }),
    });
    const corpo = await resposta.json();
    setAEnviar(null);

    if (!resposta.ok) {
      setErro(corpo.error ?? "Não foi possível enviar a sua resposta.");
      return;
    }

    setNota("");
    setMostrarReabrir(false);
    router.refresh();
  }

  return (
    <Cartao className="mb-4 border-accent/30 bg-accent-light/40 p-4">
      <div className="mb-1 flex items-center gap-2.5">
        <VerificacaoAnimada tamanho={28} />
        <p className="text-sm font-medium text-ink">O seu pedido foi marcado como resolvido</p>
      </div>
      <p className="mb-3 text-xs text-ink-400">
        Confirme se ficou tudo bem ou diga-nos o que ainda falta — o pedido volta à nossa equipa.
      </p>

      {!mostrarReabrir ? (
        <div className="flex flex-wrap gap-2">
          <Botao size="sm" onClick={() => enviar("fechar")} isLoading={aEnviar === "fechar"}>
            Confirmar resolução
          </Botao>
          <Botao size="sm" variant="secondary" onClick={() => setMostrarReabrir(true)} disabled={aEnviar !== null}>
            Preciso de mais alguma coisa
          </Botao>
        </div>
      ) : (
        <div>
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={3}
            placeholder="O que ainda falta ou continua a não funcionar?"
            className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Botao
              size="sm"
              onClick={() => enviar("reabrir")}
              isLoading={aEnviar === "reabrir"}
              disabled={!nota.trim()}
            >
              Enviar e reabrir pedido
            </Botao>
            <Botao size="sm" variant="ghost" onClick={() => setMostrarReabrir(false)} disabled={aEnviar !== null}>
              Cancelar
            </Botao>
          </div>
        </div>
      )}

      {erro && <p className="mt-2 text-sm text-danger">{erro}</p>}
    </Cartao>
  );
}
