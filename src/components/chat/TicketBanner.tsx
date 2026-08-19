import Link from "next/link";
import type { Ticket } from "@/core/types";
import { ListaAnexosTicket } from "@/components/ticket/AttachmentsList";

export function AvisoTicket({ ticket }: { ticket: Ticket }) {
  return (
    <div className="animate-entrada rounded-xl border border-accent/30 bg-accent-light px-4 py-3 text-sm text-ink">
      <p className="font-medium">Pedido encaminhado para a equipa técnica</p>
      <p className="mt-0.5 text-ink-400">
        Não tínhamos uma resposta imediata na nossa base de conhecimento, por isso abrimos o
        ticket <strong>#{ticket.id.slice(0, 8)}</strong>. Vai receber uma atualização por email
        {ticket.id ? " (e WhatsApp, se tiver contacto associado)" : ""} assim que for analisado.
      </p>

      <div className="mt-2.5 border-t border-accent/20 pt-2.5">
        <ListaAnexosTicket
          idTicket={ticket.id}
          anexosIniciais={[]}
          legenda="Se ajudar, pode anexar uma captura de ecrã do problema — facilita o trabalho de quem for analisar o seu pedido."
        />
      </div>

      <Link href={`/tickets/${ticket.id}`} className="mt-2 inline-block text-accent-hover underline">
        Acompanhar este pedido
      </Link>
    </div>
  );
}
