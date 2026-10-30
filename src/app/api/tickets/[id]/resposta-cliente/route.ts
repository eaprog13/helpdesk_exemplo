import { NextResponse } from "next/server";
import { z } from "zod";
import { ErroAutenticacao, exigirUtilizador } from "@/lib/auth/session";
import { comCors, respostaPreflightCors } from "@/lib/security/cors";
import { ErroAcessoNegado, ErroNaoEncontrado, responderClienteTicket } from "@/core/services/ticketService";

export const runtime = "nodejs";

export async function OPTIONS(pedido: Request) {
  return respostaPreflightCors(pedido);
}

const esquemaResposta = z.object({
  acao: z.enum(["fechar", "reabrir"]),
  nota: z.string().max(4000).optional(),
});

/**
 * POST /api/tickets/:id/resposta-cliente — apenas o cliente dono do ticket,
 * e só quando o ticket está "resolved" (ver responderClienteTicket em
 * core/services/ticketService.ts): "fechar" confirma a resolução; "reabrir"
 * devolve o ticket para "em resolução" com uma nota a explicar o que falta.
 * Diferente do PATCH genérico em /api/tickets/:id, que é só para staff.
 */
export async function POST(pedido: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { utilizador, perfil, dependencias } = await exigirUtilizador();

    const corpo = await pedido.json();
    const dadosValidados = esquemaResposta.safeParse(corpo);
    if (!dadosValidados.success) {
      return comCors(
        pedido,
        NextResponse.json({ error: dadosValidados.error.issues[0]?.message }, { status: 400 })
      );
    }

    const ticket = await responderClienteTicket(dependencias, utilizador, perfil, {
      idTicket: id,
      ...dadosValidados.data,
    });
    return comCors(pedido, NextResponse.json({ ticket }, { status: 200 }));
  } catch (erro) {
    if (erro instanceof ErroAutenticacao) {
      return comCors(pedido, NextResponse.json({ error: erro.message }, { status: erro.estado }));
    }
    if (erro instanceof ErroNaoEncontrado) {
      return comCors(pedido, NextResponse.json({ error: erro.message }, { status: 404 }));
    }
    if (erro instanceof ErroAcessoNegado) {
      return comCors(pedido, NextResponse.json({ error: erro.message }, { status: 403 }));
    }
    console.error("[/api/tickets/:id/resposta-cliente POST] erro:", erro);
    return comCors(pedido, NextResponse.json({ error: "Erro ao responder ao ticket." }, { status: 500 }));
  }
}
