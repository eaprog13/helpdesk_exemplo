import Link from "next/link";
import { clsx } from "clsx";
import { exigirPapel } from "@/lib/auth/session";
import { listarEquipa, listarTickets } from "@/core/services/ticketService";
import { Cartao } from "@/components/ui/Card";
import { Distintivo } from "@/components/ui/Badge";
import { formatarTempoEmFila } from "@/lib/format/tempoEmFila";

// Abas da vista de dev — ver a sidebar em admin/layout.tsx, que já liga
// para cada uma com ?vista=. "meus" é o valor por omissão (inclusive sem
// query nenhuma) porque é o que interessa a um dev logo ao abrir a página.
// "todos" já não significa "todos os tickets do sistema" — listarTickets()
// devolve só o(s) departamento(s) do dev (princípio de menor privilégio,
// ver ticketService.ts, devPodeVerTicket); o rótulo reflete isso.
const ABAS_DEV: { valor: string; rotulo: string }[] = [
  { valor: "meus", rotulo: "Os meus tickets" },
  { valor: "fila", rotulo: "Fila do departamento" },
  { valor: "todos", rotulo: "Todos do meu departamento" },
];

export default async function PaginaTicketsAdmin({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string }>;
}) {
  const { perfil, dependencias } = await exigirPapel(["admin", "dev"]);
  const { vista } = await searchParams;
  const [todosTickets, equipa] = await Promise.all([listarTickets(dependencias, perfil), listarEquipa(dependencias)]);
  const nomePorDev = new Map(equipa.map((dev) => [dev.id, dev.full_name]));

  let tickets = todosTickets;
  let titulo = "Tickets";
  const vistaAtiva = vista === "fila" || vista === "todos" ? vista : "meus";

  if (perfil.role === "dev") {
    if (vistaAtiva === "fila") {
      // Trabalho disponível para agarrar: aberto, ainda sem dev, e do(s)
      // departamento(s) deste dev — ver Departamento em core/types.ts.
      tickets = todosTickets.filter(
        (t) => !t.assigned_dev_id && t.status === "open" && t.department && perfil.department.includes(t.department)
      );
      titulo = "Fila do departamento";
    } else if (vistaAtiva === "todos") {
      titulo = "Todos do meu departamento";
    } else {
      tickets = todosTickets.filter((t) => t.assigned_dev_id === perfil.id);
      titulo = "Os meus tickets";
    }
  }

  return (
    <div className="mx-auto h-full max-w-5xl overflow-y-auto px-6 py-6">
      <h1 className="mb-1 text-lg font-semibold text-ink">{titulo}</h1>

      {perfil.role === "dev" && (
        <div className="mb-6 mt-3 flex flex-wrap gap-2">
          {ABAS_DEV.map((aba) => (
            <Link
              key={aba.valor}
              href={`/admin/tickets?vista=${aba.valor}`}
              className={clsx(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                vistaAtiva === aba.valor
                  ? "bg-ink text-white"
                  : "bg-white text-ink-400 border border-ink-100 hover:text-ink"
              )}
            >
              {aba.rotulo}
            </Link>
          ))}
        </div>
      )}
      {perfil.role !== "dev" && <div className="mb-6" />}

      <div className="space-y-3">
        {tickets.map((ticket, i) => (
          <Link key={ticket.id} href={`/admin/tickets/${ticket.id}`} className="block">
            <Cartao
              className="animate-entrada p-4 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md"
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-ink">{ticket.title}</span>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Distintivo value={ticket.department ?? "por_triar"} />
                  <Distintivo value={ticket.priority} />
                  <Distintivo value={ticket.status} />
                </div>
              </div>
              <p className="mt-2 line-clamp-1 text-xs text-ink-300">{ticket.question}</p>
              <p className="mt-1 text-[11px] text-ink-300">
                #{ticket.id.slice(0, 8)} · {new Date(ticket.created_at).toLocaleString("pt-PT")}
                {ticket.assigned_dev_id && ` · atribuído a ${nomePorDev.get(ticket.assigned_dev_id) ?? "—"}`}
                {/* Só faz sentido na fila: é aí que "há quanto tempo" decide o
                    que agarrar primeiro — "meus"/"todos" já têm dev ou
                    passaram desse estado. */}
                {vistaAtiva === "fila" && (
                  <span className="font-medium text-warning"> · {formatarTempoEmFila(ticket.created_at)}</span>
                )}
              </p>
            </Cartao>
          </Link>
        ))}
        {tickets.length === 0 && (
          <Cartao className="p-6 text-center text-sm text-ink-400">Sem tickets por agora.</Cartao>
        )}
      </div>
    </div>
  );
}
