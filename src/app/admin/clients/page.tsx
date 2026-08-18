import { exigirPapel } from "@/lib/auth/session";
import { listarClientes } from "@/core/services/clientService";
import { GestorClientes } from "./ClientsManager";

export default async function PaginaClientesAdmin() {
  const { dependencias } = await exigirPapel(["admin", "dev"]);
  const clientes = await listarClientes(dependencias);

  return <GestorClientes clientesIniciais={clientes} />;
}
