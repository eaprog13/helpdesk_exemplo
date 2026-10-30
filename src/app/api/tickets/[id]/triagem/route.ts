import { NextResponse } from "next/server";
import { z } from "zod";
import { ErroAutenticacao, exigirPapel } from "@/lib/auth/session";
import { comCors, respostaPreflightCors } from "@/lib/security/cors";
import { ErroNaoEncontrado, triarTicket } from "@/core/services/ticketService";

export const runtime = "nodejs";

export async function OPTIONS(pedido: Request) {
  return respostaPreflightCors(pedido);
}

const esquemaTriagem = z.object({
  departamento: z.enum(["desenvolvimento", "marketing", "design", "geral"]),
});

/**
 * POST /api/tickets/:id/triagem — apenas 'admin' (ver princípio de menor
 * privilégio em ticketService.ts, devPodeVerTicket: um ticket sem
 * departamento não é visível a nenhum dev, por isso nunca chega a um dev
 * para triar). Dá departamento a um ticket "Por atribuir" e dispara, na
 * mesma chamada, a atribuição automática por menor carga (ver triarTicket
 * em core/services/ticketService.ts) — diferente do PATCH genérico em
 * /api/tickets/:id, que só corrige o departamento sem reatribuir.
 */
export async function POST(pedido: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { dependencias } = await exigirPapel(["admin"]);

    const corpo = await pedido.json();
    const dadosValidados = esquemaTriagem.safeParse(corpo);
    if (!dadosValidados.success) {
      return comCors(
        pedido,
        NextResponse.json({ error: dadosValidados.error.issues[0]?.message }, { status: 400 })
      );
    }

    const ticket = await triarTicket(dependencias, id, dadosValidados.data.departamento);
    return comCors(pedido, NextResponse.json({ ticket }, { status: 200 }));
  } catch (erro) {
    if (erro instanceof ErroAutenticacao) {
      return comCors(pedido, NextResponse.json({ error: erro.message }, { status: erro.estado }));
    }
    if (erro instanceof ErroNaoEncontrado) {
      return comCors(pedido, NextResponse.json({ error: erro.message }, { status: 404 }));
    }
    console.error("[/api/tickets/:id/triagem POST] erro:", erro);
    return comCors(pedido, NextResponse.json({ error: "Erro ao triar o ticket." }, { status: 500 }));
  }
}
