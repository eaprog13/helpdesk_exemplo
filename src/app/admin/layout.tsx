import { redirect } from "next/navigation";
import { ErroAutenticacao, exigirUtilizador } from "@/lib/auth/session";
import { AdminShell } from "@/components/layout/AdminShell";
import type { Perfil } from "@/core/types";

// "Resumo" e "Dashboard" fundiram-se num só (ver admin/page.tsx +
// DashboardPrincipal.tsx) — só fica uma entrada, já em "/admin".
const ITENS_NAVEGACAO_ADMIN = [
  { href: "/admin", rotulo: "Dashboard" },
  { href: "/admin/tickets", rotulo: "Tickets" },
  { href: "/admin/clients", rotulo: "Clientes" },
  // Gere as contas de dev/admin e o(s) seu(s) departamento(s) — só admin
  // (tal como "Clientes"): decide diretamente quem entra na atribuição
  // automática de tickets (ver escolherDevPorMenorCarga em
  // ticketService.ts). Substitui o fluxo manual de
  // supabase/provisionar_equipa.sql.
  { href: "/admin/team", rotulo: "Equipa" },
  { href: "/admin/knowledge-base", rotulo: "Base de conhecimento" },
];

// Sidebar do dev: focada no trabalho de fila/resolução de tickets, não na
// gestão de clientes (criar clientes é só do admin — ver
// api/admin/clients/route.ts). "Os meus tickets" é o destino por omissão
// (é para onde o Header/login o mandam primeiro), "Fila do departamento"
// mostra o trabalho por agarrar (tickets abertos, sem dev, do seu
// departamento — ver ticketService.ts) e "Todos" já NÃO dá visibilidade
// total como o admin tem — princípio de menor privilégio: um dev só vê
// tickets do(s) seu(s) departamento(s) (ou já atribuídos a si), nunca de
// outro departamento, mesmo nesta aba (ver listarTickets/devPodeVerTicket
// em ticketService.ts).
const ITENS_NAVEGACAO_DEV = [
  { href: "/admin", rotulo: "Dashboard" },
  { href: "/admin/tickets?vista=meus", rotulo: "Os meus tickets" },
  { href: "/admin/tickets?vista=fila", rotulo: "Fila do departamento" },
  { href: "/admin/tickets?vista=todos", rotulo: "Todos do meu departamento" },
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
    <AdminShell
      itens={perfil.role === "dev" ? ITENS_NAVEGACAO_DEV : ITENS_NAVEGACAO_ADMIN}
      rotuloMarca="Vértice Digital"
      papel={perfil.role === "dev" ? "dev" : "admin"}
      departamentos={perfil.department}
      nomeCompleto={perfil.full_name}
      nomeEmpresa={perfil.role === "admin" ? "Administrador" : "Developer"}
    >
      {children}
    </AdminShell>
  );
}
