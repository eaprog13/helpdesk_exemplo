import { notFound } from "next/navigation";
import { exigirPapel } from "@/lib/auth/session";
import { ErroAcessoNegado, ErroNaoEncontrado, obterTicketComAtualizacoes } from "@/core/services/ticketService";
import { PainelDetalheTicket } from "./TicketDetailClient";

export default async function PaginaDetalheTicketAdmin({ params }: { params: { id: string } }) {
  const { perfil, dependencias } = await exigirPapel(["admin", "dev"]);

  try {
    const { ticket, atualizacoes } = await obterTicketComAtualizacoes(dependencias, perfil, params.id);
    return <PainelDetalheTicket ticket={ticket} atualizacoes={atualizacoes} />;
  } catch (erro) {
    if (erro instanceof ErroNaoEncontrado || erro instanceof ErroAcessoNegado) notFound();
    throw erro;
  }
}
