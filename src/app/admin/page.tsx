import { exigirPapel } from "@/lib/auth/session";
import { listarTickets } from "@/core/services/ticketService";
import { listarClientes } from "@/core/services/clientService";
import { Cartao } from "@/components/ui/Card";

export default async function PaginaResumoAdmin() {
  const { perfil, dependencias } = await exigirPapel(["admin", "dev"]);

  const [tickets, clientes] = await Promise.all([listarTickets(dependencias, perfil), listarClientes(dependencias)]);

  // Um dev quer ver o que é dele primeiro: o que já assumiu e onde vai
  // buscar mais trabalho (fila do seu departamento) — um admin quer a
  // fotografia geral de toda a equipa.
  const estatisticas =
    perfil.role === "dev"
      ? [
          {
            rotulo: "Por assumir (meus)",
            valor: tickets.filter((t) => t.assigned_dev_id === perfil.id && t.status === "open").length,
          },
          {
            rotulo: "Em resolução (meus)",
            valor: tickets.filter((t) => t.assigned_dev_id === perfil.id && t.status === "in_progress").length,
          },
          {
            rotulo: "Resolvidos (meus)",
            valor: tickets.filter((t) => t.assigned_dev_id === perfil.id && t.status === "resolved").length,
          },
          {
            rotulo: "Na fila do meu departamento",
            valor: tickets.filter(
              (t) => !t.assigned_dev_id && t.status === "open" && t.department && perfil.department.includes(t.department)
            ).length,
          },
        ]
      : [
          { rotulo: "Tickets abertos", valor: tickets.filter((t) => t.status === "open").length },
          { rotulo: "Em curso", valor: tickets.filter((t) => t.status === "in_progress").length },
          { rotulo: "Resolvidos", valor: tickets.filter((t) => t.status === "resolved").length },
          { rotulo: "Clientes ativos", valor: clientes.length },
        ];

  return (
    <div className="mx-auto h-full max-w-5xl overflow-y-auto px-6 py-6">
      <h1 className="mb-6 text-lg font-semibold text-ink">Resumo</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {estatisticas.map((estatistica) => (
          <Cartao key={estatistica.rotulo} className="p-5">
            <p className="text-2xl font-semibold text-ink">{estatistica.valor}</p>
            <p className="mt-1 text-xs text-ink-400">{estatistica.rotulo}</p>
          </Cartao>
        ))}
      </div>
    </div>
  );
}
