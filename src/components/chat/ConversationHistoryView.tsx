import { BolhaMensagem } from "./MessageBubble";
import { formatarTituloConversa } from "@/lib/format/dataConversa";
import type { Conversa, Mensagem } from "@/core/types";

/**
 * Mostra uma conversa do histórico — só consulta, sem caixa de pergunta.
 * Reutilizada tanto na área do cliente ("Histórico") como no admin (ver o
 * histórico de um cliente específico).
 */
export function VistaHistoricoConversa({ conversa, mensagens }: { conversa: Conversa; mensagens: Mensagem[] }) {
  return (
    <div className="mx-auto h-full max-w-3xl overflow-y-auto px-6 py-6">
      <h1 className="mb-1 text-lg font-semibold text-ink">{formatarTituloConversa(conversa.created_at)}</h1>
      <p className="mb-6 text-xs text-ink-300">só consulta</p>

      {mensagens.length === 0 && (
        <p className="text-center text-sm text-ink-400">Esta conversa não tem mensagens.</p>
      )}

      <div className="flex flex-col gap-4">
        {mensagens.map((mensagem) => (
          <BolhaMensagem key={mensagem.id} mensagem={mensagem} />
        ))}
      </div>
    </div>
  );
}
