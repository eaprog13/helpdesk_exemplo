import { redirect } from "next/navigation";
import { ErroAutenticacao, exigirUtilizador } from "@/lib/auth/session";
import { BarraLateral } from "@/components/layout/Sidebar";
import { Cabecalho } from "@/components/layout/Header";
import type { Perfil } from "@/core/types";

const ITENS_NAVEGACAO = [
  { href: "/admin", rotulo: "Resumo" },
  { href: "/admin/tickets", rotulo: "Tickets" },
  { href: "/admin/clients", rotulo: "Clientes" },
  { href: "/admin/knowledge-base", rotulo: "Base de conhecimento" },
];

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  let perfil: Perfil;
  try {
    ({ perfil } = await exigirUtilizador());
  } catch (erro) {
    if (erro instanceof ErroAutenticacao) redirect("/login");
    throw erro;
  }

  if (perfil.role !== "admin" && perfil.role !== "dev") redirect("/chat");

  return (
    <div className="flex h-screen bg-surface">
      <BarraLateral itens={ITENS_NAVEGACAO} rotuloMarca="Vértice · Dev" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Cabecalho
          nomeCompleto={perfil.full_name}
          nomeEmpresa={perfil.role === "admin" ? "Administrador" : "Developer"}
        />
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
