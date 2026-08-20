"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Botao } from "@/components/ui/Button";
import { Campo } from "@/components/ui/Input";
import { Cartao } from "@/components/ui/Card";
import type { Departamento, Ticket } from "@/core/types";

// "incerto" representa "Não tenho a certeza" — enviado à API como null,
// cai na fila "Por triar" tal como um ticket do chat sem departamento
// confiante (ver core/services/ticketService.ts). Não pode ser "" como os
// outros campos opcionais: "" já é o valor da opção-placeholder por
// escolher, e o atributo "required" do <select> não distinguiria "ainda
// não escolheu nada" de "escolheu ativamente não ter a certeza".
const VALOR_DEPARTAMENTO_INCERTO = "incerto";
const OPCOES_DEPARTAMENTO: { valor: Departamento | typeof VALOR_DEPARTAMENTO_INCERTO; rotulo: string }[] = [
  { valor: "desenvolvimento", rotulo: "Desenvolvimento — site, loja, algo técnico" },
  { valor: "marketing", rotulo: "Marketing Digital — anúncios, SEO, redes sociais" },
  { valor: "design", rotulo: "Branding/Design — identidade visual, logótipo" },
  { valor: VALOR_DEPARTAMENTO_INCERTO, rotulo: "Não tenho a certeza" },
];

/**
 * Botão que abre um modal para o cliente criar um ticket diretamente, sem
 * ter de passar pelo chat/LLM — para quando já sabe que precisa mesmo da
 * equipa técnica. Visível em qualquer página da área do cliente (ver
 * components/layout/Header.tsx), por isso é este componente que trata de
 * tudo (modal + chamada à API), não só o botão em si.
 */
export function BotaoAbrirTicket() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [departamento, setDepartamento] = useState<Departamento | typeof VALOR_DEPARTAMENTO_INCERTO | "">("");
  const [erro, setErro] = useState<string | null>(null);
  const [aCarregar, setACarregar] = useState(false);

  function fechar() {
    if (aCarregar) return;
    setAberto(false);
    setTitulo("");
    setDescricao("");
    setDepartamento("");
    setErro(null);
  }

  async function submeter(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setACarregar(true);

    const resposta = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo,
        descricao,
        departamento: departamento === VALOR_DEPARTAMENTO_INCERTO ? null : departamento || null,
      }),
    });
    const corpo = await resposta.json();
    setACarregar(false);

    if (!resposta.ok) {
      setErro(corpo.error ?? "Não foi possível abrir o ticket.");
      return;
    }

    const ticket = corpo.ticket as Ticket;
    fechar();
    router.push(`/tickets/${ticket.id}`);
  }

  return (
    <>
      <Botao variant="secondary" size="sm" onClick={() => setAberto(true)}>
        Abrir ticket
      </Botao>

      {aberto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-modal-abrir-ticket"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4"
          onClick={fechar}
        >
          <Cartao className="w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h2 id="titulo-modal-abrir-ticket" className="text-base font-semibold text-ink">
              Abrir um pedido
            </h2>
            <p className="mt-1 text-sm text-ink-400">
              Descreva o que precisa — a nossa equipa técnica vai analisar e responder.
            </p>

            <form onSubmit={submeter} className="mt-4 space-y-4">
              <div>
                <label htmlFor="tituloTicket" className="mb-1.5 block text-sm font-medium text-ink">
                  Título
                </label>
                <Campo
                  id="tituloTicket"
                  required
                  minLength={3}
                  maxLength={120}
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex.: Loja online não abre"
                />
              </div>
              <div>
                <label htmlFor="descricaoTicket" className="mb-1.5 block text-sm font-medium text-ink">
                  Descrição
                </label>
                <textarea
                  id="descricaoTicket"
                  required
                  minLength={10}
                  maxLength={4000}
                  rows={4}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descreva o problema ou pedido com o máximo de detalhe possível."
                  className="w-full resize-none rounded-lg border border-ink-100 bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="departamentoTicket" className="mb-1.5 block text-sm font-medium text-ink">
                  Sobre o que é?
                </label>
                <select
                  id="departamentoTicket"
                  required
                  value={departamento}
                  onChange={(e) => setDepartamento(e.target.value as Departamento | typeof VALOR_DEPARTAMENTO_INCERTO)}
                  className="w-full rounded-lg border border-ink-100 bg-white px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                >
                  <option value="" disabled>
                    Escolha uma opção
                  </option>
                  {OPCOES_DEPARTAMENTO.map((opcao) => (
                    <option key={opcao.rotulo} value={opcao.valor}>
                      {opcao.rotulo}
                    </option>
                  ))}
                </select>
              </div>

              {erro && (
                <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                  {erro}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Botao type="button" variant="ghost" size="sm" onClick={fechar} disabled={aCarregar}>
                  Cancelar
                </Botao>
                <Botao type="submit" size="sm" isLoading={aCarregar}>
                  Abrir ticket
                </Botao>
              </div>
            </form>
          </Cartao>
        </div>
      )}
    </>
  );
}
