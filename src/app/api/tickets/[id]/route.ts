import { NextResponse } from "next/server";
import { z } from "zod";
import { ErroAutenticacao, exigirPapel, exigirUtilizador } from "@/lib/auth/session";
import { comCors, respostaPreflightCors } from "@/lib/security/cors";
import {
  ErroAcessoNegado,
  ErroNaoEncontrado,
  obterTicketComAtualizacoes,
  atualizarTicket,
} from "@/core/services/ticketService";

export const runtime = "nodejs";

export async function OPTIONS(pedido: Request) {
  return respostaPreflightCors(pedido);
}

export async function GET(pedido: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { perfil, dependencias } = await exigirUtilizador();
    const { ticket, atualizacoes, anexos } = await obterTicketComAtualizacoes(dependencias, perfil, id);
    return comCors(pedido, NextResponse.json({ ticket, atualizacoes, anexos }, { status: 200 }));
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
    console.error("[/api/tickets/:id GET] erro:", erro);
    return comCors(pedido, NextResponse.json({ error: "Erro ao obter o ticket." }, { status: 500 }));
  }
}

const esquemaAlteracoes = z.object({
  estado: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
  prioridade: z.enum(["low", "normal", "high", "urgent"]).optional(),
  idDevAtribuido: z.string().uuid().nullable().optional(),
  nota: z.string().min(1).max(4000).optional(),
  notaVisivelParaCliente: z.boolean().optional(),
});

/** PATCH /api/tickets/:id — apenas staff (admin/dev). */
export async function PATCH(pedido: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { utilizador, dependencias } = await exigirPapel(["admin", "dev"]);

    const corpo = await pedido.json();
    const dadosValidados = esquemaAlteracoes.safeParse(corpo);
    if (!dadosValidados.success) {
      return comCors(
        pedido,
        NextResponse.json({ error: dadosValidados.error.errors[0]?.message }, { status: 400 })
      );
    }

    const ticket = await atualizarTicket(dependencias, utilizador, { idTicket: id, ...dadosValidados.data });
    return comCors(pedido, NextResponse.json({ ticket }, { status: 200 }));
  } catch (erro) {
    if (erro instanceof ErroAutenticacao) {
      return comCors(pedido, NextResponse.json({ error: erro.message }, { status: erro.estado }));
    }
    if (erro instanceof ErroNaoEncontrado) {
      return comCors(pedido, NextResponse.json({ error: erro.message }, { status: 404 }));
    }
    console.error("[/api/tickets/:id PATCH] erro:", erro);
    return comCors(pedido, NextResponse.json({ error: "Erro ao atualizar o ticket." }, { status: 500 }));
  }
}
