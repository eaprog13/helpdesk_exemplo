import { notFound } from "next/navigation";
import { exigirPapel } from "@/lib/auth/session";
import { ErroAcessoNegado, ErroNaoEncontrado, obterConversaComMensagens } from "@/core/services/chatService";
import { VistaHistoricoConversa } from "@/components/chat/ConversationHistoryView";

export default async function PaginaDetalheHistoricoAdmin({
  params,
}: {
  params: Promise<{ id: string; conversationId: string }>;
}) {
  const { conversationId } = await params;
  const { perfil, dependencias } = await exigirPapel(["admin", "dev"]);

  let dados: Awaited<ReturnType<typeof obterConversaComMensagens>>;
  try {
    dados = await obterConversaComMensagens(dependencias, perfil, conversationId);
  } catch (erro) {
    if (erro instanceof ErroNaoEncontrado || erro instanceof ErroAcessoNegado) notFound();
    throw erro;
  }
  return <VistaHistoricoConversa conversa={dados.conversa} mensagens={dados.mensagens} />;
}
