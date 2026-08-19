import { notFound } from "next/navigation";
import { exigirUtilizador } from "@/lib/auth/session";
import { ErroAcessoNegado, ErroNaoEncontrado, obterConversaComMensagens } from "@/core/services/chatService";
import { VistaHistoricoConversa } from "@/components/chat/ConversationHistoryView";

export default async function PaginaDetalheHistoricoCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { perfil, dependencias } = await exigirUtilizador();

  try {
    const { conversa, mensagens } = await obterConversaComMensagens(dependencias, perfil, id);
    return <VistaHistoricoConversa conversa={conversa} mensagens={mensagens} />;
  } catch (erro) {
    if (erro instanceof ErroNaoEncontrado || erro instanceof ErroAcessoNegado) notFound();
    throw erro;
  }
}
