import { notFound } from "next/navigation";
import { exigirPapel } from "@/lib/auth/session";
import { ErroAcessoNegado, ErroNaoEncontrado, obterTicketComAtualizacoes } from "@/core/services/ticketService";
import { PainelDetalheTicket } from "./TicketDetailClient";

export default async function PaginaDetalheTicketAdmin({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { perfil, dependencias } = await exigirPapel(["admin", "dev"]);

  try {
    const { ticket, atualizacoes, anexos } = await obterTicketComAtualizacoes(dependencias, perfil, id);
    return (
      <PainelDetalheTicket
        ticket={ticket}
        atualizacoes={atualizacoes}
        anexos={anexos}
        perfilAtual={{ id: perfil.id, role: perfil.role, department: perfil.department }}
      />
    );
  } catch (erro) {
    if (erro instanceof ErroNaoEncontrado || erro instanceof ErroAcessoNegado) notFound();
    throw erro;
  }
}
