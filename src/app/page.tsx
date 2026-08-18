import { redirect } from "next/navigation";
import { ErroAutenticacao, exigirUtilizador } from "@/lib/auth/session";

export default async function PaginaInicial() {
  try {
    const { perfil } = await exigirUtilizador();
    if (perfil.role === "admin" || perfil.role === "dev") redirect("/admin");
    redirect("/chat");
  } catch (erro) {
    if (erro instanceof ErroAutenticacao) redirect("/login");
    throw erro;
  }
}
