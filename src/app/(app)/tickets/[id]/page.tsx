import { notFound } from "next/navigation";
import { exigirUtilizador } from "@/lib/auth/session";
import { ErroAcessoNegado, ErroNaoEncontrado, obterTicketComAtualizacoes } from "@/core/services/ticketService";
import { Cartao } from "@/components/ui/Card";
import { Distintivo } from "@/components/ui/Badge";

export default async function PaginaDetalhePedidoCliente({ params }: { params: { id: string } }) {
  const { perfil, dependencias } = await exigirUtilizador();

  let resultado;
  try {
    resultado = await obterTicketComAtualizacoes(dependencias, perfil, params.id);
  } catch (erro) {
    if (erro instanceof ErroNaoEncontrado || erro instanceof ErroAcessoNegado) notFound();
    throw erro;
  }
  const { ticket, atualizacoes } = resultado;

  return (
    <div className="mx-auto h-full max-w-3xl overflow-y-auto px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-ink">{ticket.title}</h1>
        <Distintivo value={ticket.status} />
      </div>

      <Cartao className="mb-4 p-4">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-300">A sua pergunta</p>
        <p className="text-sm text-ink">{ticket.question}</p>
      </Cartao>

      <p className="mb-3 text-sm font-medium text-ink">Atualizações</p>
      <div className="space-y-3">
        {atualizacoes.length === 0 && (
          <Cartao className="p-4 text-sm text-ink-400">
            A nossa equipa ainda não adicionou nenhuma atualização visível. Vai receber um email
            (e WhatsApp, se aplicável) assim que houver novidades.
          </Cartao>
        )}
        {atualizacoes.map((atualizacao) => (
          <Cartao key={atualizacao.id} className="p-4">
            <p className="text-sm text-ink">{atualizacao.note}</p>
            <p className="mt-2 text-[11px] text-ink-300">
              {new Date(atualizacao.created_at).toLocaleString("pt-PT")}
            </p>
          </Cartao>
        ))}
      </div>
    </div>
  );
}
