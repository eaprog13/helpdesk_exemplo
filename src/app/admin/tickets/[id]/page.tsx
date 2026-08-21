import { notFound } from "next/navigation";
import { exigirPapel } from "@/lib/auth/session";
import { ErroAcessoNegado, ErroNaoEncontrado, obterTicketComAtualizacoes } from "@/core/services/ticketService";
import { PainelDetalheTicket } from "./TicketDetailClient";

export default async function PaginaDetalheTicketAdmin({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { perfil, dependencias } = await exigirPapel(["admin", "dev"]);

  let dados: Awaited<ReturnType<typeof obterTicketComAtualizacoes>>;
  try {
    dados = await obterTicketComAtualizacoes(dependencias, perfil, id);
  } catch (erro) {
    if (erro instanceof ErroNaoEncontrado || erro instanceof ErroAcessoNegado) notFound();
    throw erro;
  }
  return (
    <PainelDetalheTicket
      ticket={dados.ticket}
      atualizacoes={dados.atualizacoes}
      anexos={dados.anexos}
      perfilAtual={{ id: perfil.id, role: perfil.role, department: perfil.department }}
    />
  );
}
