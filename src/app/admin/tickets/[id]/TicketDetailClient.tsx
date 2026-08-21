"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Cartao } from "@/components/ui/Card";
import { Distintivo } from "@/components/ui/Badge";
import { Botao } from "@/components/ui/Button";
import { CaixaSelecao } from "@/components/ui/Checkbox";
import { ListaAnexosTicket } from "@/components/ticket/AttachmentsList";
import type {
  Ticket,
  EstadoTicket,
  PrioridadeTicket,
  Departamento,
  Perfil,
  AtualizacaoTicket,
  AnexoTicketComUrl,
} from "@/core/types";

const OPCOES_ESTADO: EstadoTicket[] = ["open", "in_progress", "resolved", "closed"];
// Ordem de menos para mais urgente — corresponde à ordem em que aparecem
// os botões, para ler como uma escala, não uma lista arbitrária.
const OPCOES_PRIORIDADE: PrioridadeTicket[] = ["low", "normal", "high", "urgent"];
const OPCOES_DEPARTAMENTO: Departamento[] = ["desenvolvimento", "marketing", "design", "geral"];
const ROTULOS_DEPARTAMENTO: Record<Departamento, string> = {
  desenvolvimento: "Desenvolvimento",
  marketing: "Marketing Digital",
  design: "Branding/Design",
  geral: "Geral",
};

export function PainelDetalheTicket({
  ticket,
  atualizacoes,
  anexos,
  perfilAtual,
}: {
  ticket: Ticket;
  atualizacoes: AtualizacaoTicket[];
  anexos: AnexoTicketComUrl[];
  /** Quem está a ver o ecrã — decide que ações do fluxo (ver ticketService.ts) aparecem. */
  perfilAtual: Pick<Perfil, "id" | "role" | "department">;
}) {
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoTicket>(ticket.status);
  const [prioridade, setPrioridade] = useState<PrioridadeTicket>(ticket.priority);
  const [nota, setNota] = useState("");
  const [visivelParaCliente, setVisivelParaCliente] = useState(true);
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const souAdmin = perfilAtual.role === "admin";
  const souDev = perfilAtual.role === "dev";
  // Um dev não pode alterar nada (nota, prioridade, anexos, reatribuição)
  // depois de entregar a resposta — fica à espera que o cliente confirme
  // ou devolva o pedido (ver responderClienteTicket em ticketService.ts).
  // Fechado é sempre terminal. Um admin nunca fica bloqueado — pode
  // sempre corrigir um engano.
  const devBloqueadoNesteEstado = souDev && (ticket.status === "resolved" || ticket.status === "closed");
  const podeAlterar = souAdmin || !devBloqueadoNesteEstado;
  const atribuidoAMim = ticket.assigned_dev_id === perfilAtual.id;
  const posso_assumir =
    souDev &&
    ticket.status === "open" &&
    !!ticket.department && // "por triar" tem de ser classificado primeiro (ver card acima)
    (!ticket.assigned_dev_id || atribuidoAMim) &&
    perfilAtual.department.includes(ticket.department);
  const posso_resolver = (souDev || souAdmin) && ticket.status === "in_progress" && (atribuidoAMim || souAdmin);

  async function mudarEstado(novoEstado: EstadoTicket) {
    await guardar({ estado: novoEstado });
  }

  const [equipa, setEquipa] = useState<Perfil[]>([]);
  const [aCarregarEquipa, setACarregarEquipa] = useState(false);
  const [departamentoTriagem, setDepartamentoTriagem] = useState<Departamento | "">("");
  const [aTriar, setATriar] = useState(false);
  const [erroTriagem, setErroTriagem] = useState<string | null>(null);

  // Só faz sentido pedir a equipa depois de o ticket ter departamento — sem
  // isso não há nenhum grupo de devs "candidato" a mostrar no seletor.
  useEffect(() => {
    if (!ticket.department) return;
    let cancelado = false;
    // Padrão de "loading flag" documentado pelo próprio React para fetch em
    // efeitos (define o estado de carregamento antes de disparar o pedido).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setACarregarEquipa(true);
    fetch(`/api/admin/team?departamento=${ticket.department}`)
      .then((r) => r.json())
      .then((corpo) => {
        if (!cancelado) setEquipa(corpo.equipa ?? []);
      })
      .finally(() => {
        if (!cancelado) setACarregarEquipa(false);
      });
    return () => {
      cancelado = true;
    };
  }, [ticket.department]);

  async function guardar(alteracoes: Record<string, unknown>) {
    setAGuardar(true);
    setErro(null);
    const resposta = await fetch(`/api/tickets/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nota: nota.trim() || undefined,
        notaVisivelParaCliente: visivelParaCliente,
        ...alteracoes,
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

  async function triar() {
    if (!departamentoTriagem) return;
    setATriar(true);
    setErroTriagem(null);
    const resposta = await fetch(`/api/tickets/${ticket.id}/triagem`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ departamento: departamentoTriagem }),
    });
    const corpo = await resposta.json();
    setATriar(false);

    if (!resposta.ok) {
      setErroTriagem(corpo.error ?? "Não foi possível triar o ticket.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="mx-auto h-full max-w-3xl overflow-y-auto px-6 py-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-ink">{ticket.title}</h1>
        <div className="flex items-center gap-2">
          <Distintivo value={ticket.priority} />
          <Distintivo value={ticket.status} />
        </div>
      </div>
      <Link
        href={`/admin/clients/${ticket.client_id}/history`}
        className="mb-4 inline-block text-xs text-ink-400 transition-colors duration-150 hover:text-ink hover:underline"
      >
        Ver histórico deste cliente →
      </Link>

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
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-300">Anexos</p>
        <ListaAnexosTicket
          idTicket={ticket.id}
          anexosIniciais={anexos}
          podeAnexar={podeAlterar}
          legenda={anexos.length === 0 ? "O cliente ainda não anexou nenhum ficheiro." : undefined}
        />
      </Cartao>

      <Cartao className="mb-4 p-4">
        <p className="mb-2 text-sm font-medium text-ink">Departamento e atribuição</p>
        <div className="mb-3">
          <Distintivo value={ticket.department ?? "por_triar"} />
        </div>

        {/* Um ticket sem departamento não é visível a nenhum dev (princípio
            de menor privilégio, ver devPodeVerTicket em ticketService.ts)
            — só um admin chega a esta página para o poder triar. */}
        {!ticket.department && souAdmin && (
          <div className="space-y-2">
            <p className="text-xs text-ink-400">
              Sem departamento confiante para atribuir sozinho (ver nota em chatService.ts). Escolha um para
              acionar a atribuição automática por menor carga.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={departamentoTriagem}
                onChange={(e) => setDepartamentoTriagem(e.target.value as Departamento | "")}
                className="rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="" disabled>
                  Escolher departamento
                </option>
                {OPCOES_DEPARTAMENTO.map((d) => (
                  <option key={d} value={d}>
                    {ROTULOS_DEPARTAMENTO[d]}
                  </option>
                ))}
              </select>
              <Botao size="sm" disabled={!departamentoTriagem} isLoading={aTriar} onClick={triar}>
                Atribuir
              </Botao>
            </div>
            {erroTriagem && <p className="text-sm text-danger">{erroTriagem}</p>}
          </div>
        )}

        {ticket.department && (
          <div>
            <label htmlFor="devResponsavel" className="mb-1.5 block text-xs font-medium text-ink-400">
              Dev responsável
            </label>
            <select
              id="devResponsavel"
              defaultValue={ticket.assigned_dev_id ?? ""}
              onChange={(e) => guardar({ idDevAtribuido: e.target.value || null })}
              disabled={aGuardar || !podeAlterar}
              className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Sem atribuição</option>
              {equipa.map((dev) => (
                <option key={dev.id} value={dev.id}>
                  {dev.full_name}
                </option>
              ))}
            </select>
            {aCarregarEquipa && <p className="mt-1 text-xs text-ink-300">A carregar equipa…</p>}
          </div>
        )}
      </Cartao>

      <Cartao className="mb-4 p-4">
        <p className="mb-2 text-sm font-medium text-ink">Fluxo do ticket</p>
        {posso_assumir && (
          <div>
            <p className="mb-2 text-xs text-ink-400">
              {ticket.assigned_dev_id
                ? "Este ticket já lhe está atribuído — assuma-o para começar a trabalhar nele."
                : "Ticket por assumir na fila do seu departamento."}
            </p>
            <Botao size="sm" onClick={() => mudarEstado("in_progress")} isLoading={aGuardar}>
              Assumir ticket
            </Botao>
          </div>
        )}
        {posso_resolver && (
          <p className="text-xs text-ink-400">
            Em resolução{atribuidoAMim ? " por si" : ""}. Escreva a resposta ao cliente na caixa &quot;Adicionar
            nota&quot; abaixo e use o botão &quot;Entregar resposta e marcar como resolvido&quot;.
          </p>
        )}
        {ticket.status === "resolved" && (
          <p className="text-xs text-ink-400">
            Resolvido — a aguardar que o cliente confirme ou peça mais alguma coisa.
          </p>
        )}
        {ticket.status === "closed" && <p className="text-xs text-ink-400">Ticket fechado. Fim do fluxo.</p>}
        {!posso_assumir && !posso_resolver && ticket.status === "open" && (
          <p className="text-xs text-ink-400">
            {ticket.assigned_dev_id ? "Aberto — atribuído a outro dev, ainda por assumir." : "Aberto — ainda sem dev atribuído."}
          </p>
        )}
        {ticket.status === "in_progress" && !posso_resolver && (
          <p className="text-xs text-ink-400">Em resolução por outro dev.</p>
        )}

        {souAdmin && (
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-medium text-ink-400 hover:text-ink">
              Alterar estado manualmente (admin)
            </summary>
            <p className="mb-2 mt-2 text-xs text-ink-300">
              Substitui o fluxo normal (aberto → em resolução → resolvido → fechado/reaberto pelo cliente) — usar só
              para corrigir enganos.
            </p>
            <div className="flex flex-wrap gap-2">
              {OPCOES_ESTADO.map((opcao) => (
                <Botao
                  key={opcao}
                  size="sm"
                  variant={opcao === estado ? "primary" : "secondary"}
                  onClick={() => {
                    setEstado(opcao);
                    guardar({ estado: opcao });
                  }}
                  isLoading={aGuardar && opcao === estado}
                >
                  {opcao}
                </Botao>
              ))}
            </div>
          </details>
        )}
      </Cartao>

      <Cartao className="mb-4 p-4">
        <p className="mb-2 text-sm font-medium text-ink">Alterar prioridade</p>
        {podeAlterar ? (
          <div className="flex flex-wrap gap-2">
            {OPCOES_PRIORIDADE.map((opcao) => (
              <Botao
                key={opcao}
                size="sm"
                variant={opcao === prioridade ? "primary" : "secondary"}
                onClick={() => {
                  setPrioridade(opcao);
                  guardar({ prioridade: opcao });
                }}
                isLoading={aGuardar && opcao === prioridade}
              >
                <Distintivo value={opcao} />
              </Botao>
            ))}
          </div>
        ) : (
          <Distintivo value={prioridade} />
        )}
      </Cartao>

      {podeAlterar ? (
        <Cartao className="mb-4 p-4">
          <p className="mb-2 text-sm font-medium text-ink">{posso_resolver ? "Resposta ao cliente" : "Adicionar nota"}</p>
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={3}
            placeholder={
              posso_resolver
                ? "Escreva a resposta que resolve o pedido — é entregue ao cliente ao marcar como resolvido…"
                : "Escreva uma atualização para o histórico interno ou para o cliente…"
            }
            className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-accent"
          />
          {!posso_resolver && (
            <CaixaSelecao
              className="mt-2 text-xs"
              rotulo="Visível para o cliente"
              checked={visivelParaCliente}
              onChange={(e) => setVisivelParaCliente(e.target.checked)}
            />
          )}
          {posso_resolver && (
            <p className="mt-2 text-xs text-ink-300">Esta nota é sempre entregue ao cliente ao resolver o ticket.</p>
          )}
          {erro && <p className="mt-2 text-sm text-danger">{erro}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Botao size="sm" variant="secondary" onClick={() => guardar({})} isLoading={aGuardar} disabled={!nota.trim()}>
              Guardar nota
            </Botao>
            {posso_resolver && (
              <Botao size="sm" onClick={() => mudarEstado("resolved")} isLoading={aGuardar} disabled={!nota.trim()}>
                Entregar resposta e marcar como resolvido
              </Botao>
            )}
          </div>
        </Cartao>
      ) : (
        <Cartao className="mb-4 p-4">
          <p className="text-sm font-medium text-ink">
            {ticket.status === "resolved" ? "Resposta já entregue" : "Pedido fechado"}
          </p>
          <p className="mt-1 text-xs text-ink-400">
            {ticket.status === "resolved"
              ? "Já não pode alterar nada aqui — aguarde o cliente confirmar ou devolver o pedido."
              : "O ciclo terminou. Já não é possível escrever nem anexar mais nada."}
          </p>
        </Cartao>
      )}

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
