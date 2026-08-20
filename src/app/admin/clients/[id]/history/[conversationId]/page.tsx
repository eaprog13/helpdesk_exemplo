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

  try {
    const { conversa, mensagens } = await obterConversaComMensagens(dependencias, perfil, conversationId);
    return <VistaHistoricoConversa conversa={conversa} mensagens={mensagens} />;
  } catch (erro) {
    if (erro instanceof ErroNaoEncontrado || erro instanceof ErroAcessoNegado) notFound();
    throw erro;
  }
}
