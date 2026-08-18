import Link from "next/link";
import type { Ticket } from "@/core/types";

export function AvisoTicket({ ticket }: { ticket: Ticket }) {
  return (
    <div className="animate-entrada rounded-xl border border-accent/30 bg-accent-light px-4 py-3 text-sm text-ink">
      <p className="font-medium">Pedido encaminhado para a equipa técnica</p>
      <p className="mt-0.5 text-ink-400">
        Não tínhamos uma resposta imediata na nossa base de conhecimento, por isso abrimos o
        ticket <strong>#{ticket.id.slice(0, 8)}</strong>. Vai receber uma atualização por email
        {ticket.id ? " (e WhatsApp, se tiver contacto associado)" : ""} assim que for analisado.
      </p>
      <Link href={`/tickets/${ticket.id}`} className="mt-1.5 inline-block text-accent-hover underline">
        Acompanhar este pedido
      </Link>
    </div>
  );
}
