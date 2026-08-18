import { redirect } from "next/navigation";
import { ErroAutenticacao, exigirUtilizador } from "@/lib/auth/session";
import { Cabecalho } from "@/components/layout/Header";
import type { Perfil } from "@/core/types";

export default async function LayoutCliente({ children }: { children: React.ReactNode }) {
  let perfil: Perfil;
  try {
    ({ perfil } = await exigirUtilizador());
  } catch (erro) {
    if (erro instanceof ErroAutenticacao) redirect("/login");
    throw erro;
  }

  if (perfil.role === "admin" || perfil.role === "dev") redirect("/admin");
  if (perfil.must_change_password) redirect("/change-password");

  return (
    <div className="flex h-screen flex-col bg-surface">
      <Cabecalho
        nomeCompleto={perfil.full_name}
        nomeEmpresa={perfil.company_name}
        logoUrl={perfil.logo_url}
        mostrarNavegacaoCliente
      />
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
