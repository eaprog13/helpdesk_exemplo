import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirPapel } from "@/lib/auth/session";
import { listarConversas } from "@/core/services/chatService";
import { Cartao } from "@/components/ui/Card";

export default async function PaginaHistoricoClienteAdmin({ params }: { params: { id: string } }) {
  const { perfil, dependencias } = await exigirPapel(["admin", "dev"]);

  const [cliente, conversas] = await Promise.all([
    dependencias.perfis.obterPorId(params.id),
    listarConversas(dependencias, perfil, params.id),
  ]);

  if (!cliente) notFound();

  return (
    <div className="mx-auto h-full max-w-3xl overflow-y-auto px-6 py-6">
      <Link
        href="/admin/clients"
        className="mb-4 inline-block text-xs text-ink-400 transition-colors duration-150 hover:text-ink hover:underline"
      >
        ← Clientes
      </Link>
      <h1 className="mb-1 text-lg font-semibold text-ink">Histórico — {cliente.full_name}</h1>
      <p className="mb-6 text-sm text-ink-400">{cliente.company_name}</p>

      {conversas.length === 0 && (
        <Cartao className="p-6 text-center text-sm text-ink-400">Este cliente ainda não tem conversas.</Cartao>
      )}

      <div className="space-y-3">
        {conversas.map((conversa, i) => (
          <Link key={conversa.id} href={`/admin/clients/${params.id}/history/${conversa.id}`} className="block">
            <Cartao
              className="animate-entrada p-4 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md"
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            >
              <p className="text-sm font-medium text-ink">{conversa.subject ?? "Conversa"}</p>
              <p className="mt-1 text-xs text-ink-300">{new Date(conversa.created_at).toLocaleString("pt-PT")}</p>
            </Cartao>
          </Link>
        ))}
      </div>
    </div>
  );
}
