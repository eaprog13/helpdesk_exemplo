"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Cartao } from "@/components/ui/Card";
import { Distintivo } from "@/components/ui/Badge";
import { Botao } from "@/components/ui/Button";
import type { Ticket, EstadoTicket, AtualizacaoTicket } from "@/core/types";

const OPCOES_ESTADO: EstadoTicket[] = ["open", "in_progress", "resolved", "closed"];

export function PainelDetalheTicket({
  ticket,
  atualizacoes,
}: {
  ticket: Ticket;
  atualizacoes: AtualizacaoTicket[];
}) {
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoTicket>(ticket.status);
  const [nota, setNota] = useState("");
  const [visivelParaCliente, setVisivelParaCliente] = useState(true);
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function guardar(novoEstado?: EstadoTicket) {
    setAGuardar(true);
    setErro(null);
    const resposta = await fetch(`/api/tickets/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        estado: novoEstado ?? estado,
        nota: nota.trim() || undefined,
        notaVisivelParaCliente: visivelParaCliente,
      }),
    });
    const corpo = await resposta.json();
    setAGuardar(false);

    if (!resposta.ok) {
      setErro(corpo.error ?? "Não foi possível guardar.");
      return;
    }

    setNota("");
    router.refresh();
  }

  return (
    <div className="mx-auto h-full max-w-3xl overflow-y-auto px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-ink">{ticket.title}</h1>
        <Distintivo value={ticket.status} />
      </div>

      <Cartao className="mb-4 p-4">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-300">Pergunta do cliente</p>
        <p className="mb-3 text-sm text-ink">{ticket.question}</p>
        {ticket.llm_answer && (
          <>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-300">
              Resposta dada pela LLM ao cliente
            </p>
            <p className="text-sm text-ink-400">{ticket.llm_answer}</p>
          </>
        )}
      </Cartao>

      <Cartao className="mb-4 p-4">
        <p className="mb-2 text-sm font-medium text-ink">Alterar estado</p>
        <div className="flex flex-wrap gap-2">
          {OPCOES_ESTADO.map((opcao) => (
            <Botao
              key={opcao}
              size="sm"
              variant={opcao === estado ? "primary" : "secondary"}
              onClick={() => {
                setEstado(opcao);
                guardar(opcao);
              }}
              isLoading={aGuardar && opcao === estado}
            >
              {opcao}
            </Botao>
          ))}
        </div>
      </Cartao>

      <Cartao className="mb-4 p-4">
        <p className="mb-2 text-sm font-medium text-ink">Adicionar nota</p>
        <textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          rows={3}
          placeholder="Escreva uma atualização para o histórico interno ou para o cliente…"
          className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <label className="mt-2 flex items-center gap-2 text-xs text-ink-400">
          <input
            type="checkbox"
            checked={visivelParaCliente}
            onChange={(e) => setVisivelParaCliente(e.target.checked)}
          />
          Visível para o cliente
        </label>
        {erro && <p className="mt-2 text-sm text-danger">{erro}</p>}
        <Botao className="mt-3" size="sm" onClick={() => guardar()} isLoading={aGuardar} disabled={!nota.trim()}>
          Guardar nota
        </Botao>
      </Cartao>

      <p className="mb-2 text-sm font-medium text-ink">Histórico</p>
      <div className="space-y-2">
        {atualizacoes.map((atualizacao) => (
          <Cartao key={atualizacao.id} className="p-3 text-sm">
            <p className="text-ink">{atualizacao.note}</p>
            <p className="mt-1 text-[11px] text-ink-300">
              {new Date(atualizacao.created_at).toLocaleString("pt-PT")} ·{" "}
              {atualizacao.visible_to_client ? "visível ao cliente" : "interno"}
            </p>
          </Cartao>
        ))}
      </div>
    </div>
  );
}
