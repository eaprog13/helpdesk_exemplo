import { exigirPapel } from "@/lib/auth/session";
import { obterEstatisticasTickets } from "@/core/services/ticketService";
import { PainelPrincipal } from "./DashboardPrincipal";

// Página de entrada de admin/dev (ver LayoutAdmin) — antes era um "Resumo"
// simples e um "/admin/dashboard" separado com métricas mais ricas; os
// dois fundiram-se aqui, e a aba "Resumo" saiu da sidebar (ver
// admin/layout.tsx) — só fica "Dashboard", já a apontar para "/admin".
export default async function PaginaAdmin() {
  const { perfil, dependencias } = await exigirPapel(["admin", "dev"]);
  const estatisticas = await obterEstatisticasTickets(dependencias, perfil);

  return <PainelPrincipal estatisticas={estatisticas} papel={perfil.role as "admin" | "dev"} />;
}
