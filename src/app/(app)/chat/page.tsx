import { exigirUtilizador } from "@/lib/auth/session";
import { JanelaChat } from "@/components/chat/ChatWindow";

export default async function PaginaChat() {
  const { perfil } = await exigirUtilizador();
  return <JanelaChat nomeCompleto={perfil.full_name} />;
}
