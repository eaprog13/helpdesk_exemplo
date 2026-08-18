import Link from "next/link";
import { exigirPapel } from "@/lib/auth/session";
import { listarTickets } from "@/core/services/ticketService";
import { Cartao } from "@/components/ui/Card";
import { Distintivo } from "@/components/ui/Badge";

export default async function PaginaTicketsAdmin() {
  const { perfil, dependencias } = await exigirPapel(["admin", "dev"]);
  const tickets = await listarTickets(dependencias, perfil);

  return (
    <div className="mx-auto h-full max-w-5xl overflow-y-auto px-6 py-6">
      <h1 className="mb-6 text-lg font-semibold text-ink">Tickets</h1>

      <div className="space-y-3">
        {tickets.map((ticket, i) => (
          <Link key={ticket.id} href={`/admin/tickets/${ticket.id}`} className="block">
            <Cartao
              className="animate-entrada p-4 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md"
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-ink">{ticket.title}</span>
                <div className="flex items-center gap-2">
                  <Distintivo value={ticket.priority} />
                  <Distintivo value={ticket.status} />
                </div>
              </div>
              <p className="mt-2 line-clamp-1 text-xs text-ink-300">{ticket.question}</p>
              <p className="mt-1 text-[11px] text-ink-300">
                #{ticket.id.slice(0, 8)} · {new Date(ticket.created_at).toLocaleString("pt-PT")}
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
