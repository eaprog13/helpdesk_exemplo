import { exigirPapel } from "@/lib/auth/session";
import { listarEquipa } from "@/core/services/ticketService";
import { GestorEquipa } from "./TeamManager";

export default async function PaginaEquipaAdmin() {
  const { dependencias } = await exigirPapel(["admin", "dev"]);
  const equipa = await listarEquipa(dependencias);

  return <GestorEquipa equipaInicial={equipa} />;
}
