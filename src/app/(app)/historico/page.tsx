import Link from "next/link";
import { exigirUtilizador } from "@/lib/auth/session";
import { listarConversas } from "@/core/services/chatService";
import { Cartao } from "@/components/ui/Card";

export default async function PaginaHistoricoCliente() {
  const { perfil, dependencias } = await exigirUtilizador();
  const conversas = await listarConversas(dependencias, perfil);

  return (
    <div className="mx-auto h-full max-w-3xl overflow-y-auto px-6 py-6">
      <h1 className="mb-1 text-lg font-semibold text-ink">Histórico</h1>
      <p className="mb-6 text-sm text-ink-400">
        As suas conversas anteriores. Para continuar a falar connosco, use sempre a conversa atual.
      </p>

      {conversas.length === 0 && (
        <Cartao className="p-6 text-center text-sm text-ink-400">Ainda não tem conversas anteriores.</Cartao>
      )}

      <div className="space-y-3">
        {conversas.map((conversa, i) => (
          <Link key={conversa.id} href={`/historico/${conversa.id}`} className="block">
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
