import { exigirPapel } from "@/lib/auth/session";
import { listarBaseConhecimento } from "@/core/services/knowledgeBaseService";
import { GestorBaseConhecimento } from "./KnowledgeBaseManager";

export default async function PaginaBaseConhecimentoAdmin() {
  const { perfil, dependencias } = await exigirPapel(["admin", "dev"]);
  const entradas = await listarBaseConhecimento(dependencias);

  return <GestorBaseConhecimento entradasIniciais={entradas} papel={perfil.role === "admin" ? "admin" : "dev"} />;
}
