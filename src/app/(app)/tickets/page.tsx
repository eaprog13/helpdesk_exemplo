import Link from "next/link";
import { exigirUtilizador } from "@/lib/auth/session";
import { listarTickets } from "@/core/services/ticketService";
import { Cartao } from "@/components/ui/Card";
import { Distintivo } from "@/components/ui/Badge";

export default async function PaginaPedidosCliente() {
  const { perfil, dependencias } = await exigirUtilizador();
  const tickets = await listarTickets(dependencias, perfil);

  return (
    <div className="mx-auto h-full max-w-3xl overflow-y-auto px-6 py-6">
      <h1 className="mb-1 text-lg font-semibold text-ink">Os meus pedidos</h1>
      <p className="mb-6 text-sm text-ink-400">
        Perguntas que exigiram a intervenção da nossa equipa técnica.
      </p>

      {tickets.length === 0 && (
        <Cartao className="p-6 text-center text-sm text-ink-400">
          Ainda não tem nenhum pedido registado.
        </Cartao>
      )}

      <div className="space-y-3">
        {tickets.map((ticket, i) => (
          <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="block">
            <Cartao interativo className="animate-entrada p-4" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-ink">{ticket.title}</span>
                <Distintivo value={ticket.status} />
              </div>
              <p className="line-clamp-2 text-xs text-ink-400">{ticket.question}</p>
              <p className="mt-2 text-[11px] text-ink-300">
                #{ticket.id.slice(0, 8)} · {new Date(ticket.created_at).toLocaleString("pt-PT")}
              </p>
            </Cartao>
          </Link>
        ))}
      </div>
    </div>
  );
}
