import Link from "next/link";
import { exigirUtilizador } from "@/lib/auth/session";
import { listarConversas } from "@/core/services/chatService";
import { listarTickets } from "@/core/services/ticketService";
import { Cartao } from "@/components/ui/Card";
import { Distintivo } from "@/components/ui/Badge";
import { formatarTituloConversa } from "@/lib/format/dataConversa";
import { estadoConversa } from "@/lib/format/estadoConversa";
import type { Ticket } from "@/core/types";

export default async function PaginaHistoricoCliente() {
  const { perfil, dependencias } = await exigirUtilizador();
  const [conversas, tickets] = await Promise.all([
    listarConversas(dependencias, perfil),
    listarTickets(dependencias, perfil),
  ]);

  // Agrupar os tickets do cliente por conversa, para dar a cada cartão o
  // seu estado (ver estadoConversa) sem precisar de uma pesquisa por
  // conversa à base de dados.
  const ticketsPorConversa = new Map<string, Ticket[]>();
  for (const ticket of tickets) {
    const lista = ticketsPorConversa.get(ticket.conversation_id) ?? [];
    lista.push(ticket);
    ticketsPorConversa.set(ticket.conversation_id, lista);
  }

  return (
    <div className="mx-auto h-full max-w-3xl overflow-y-auto px-6 py-6">
      <h1 className="mb-1 text-lg font-semibold text-ink">Histórico</h1>
      <p className="mb-6 text-sm text-ink-400">
        As suas conversas anteriores. Para continuar a falar connosco, use sempre a conversa atual.
      </p>

      {conversas.length === 0 && (
        <Cartao className="p-6 text-center text-sm text-ink-400">Ainda não tem conversas anteriores.</Cartao>
      )}

      <div className="space-y-3">
        {conversas.map((conversa, i) => (
          <Link key={conversa.id} href={`/historico/${conversa.id}`} className="block">
            <Cartao
              interativo
              className="animate-entrada flex items-center justify-between gap-3 p-4"
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            >
              <span className="text-sm font-medium text-ink">{formatarTituloConversa(conversa.created_at)}</span>
              <Distintivo value={estadoConversa(ticketsPorConversa.get(conversa.id) ?? [])} />
            </Cartao>
          </Link>
        ))}
      </div>
    </div>
  );
}
