import { NextResponse } from "next/server";
import { ErroAutenticacao, exigirUtilizador } from "@/lib/auth/session";
import { comCors, respostaPreflightCors } from "@/lib/security/cors";
import { listarTickets } from "@/core/services/ticketService";

export const runtime = "nodejs";

export async function OPTIONS(pedido: Request) {
  return respostaPreflightCors(pedido);
}

/**
 * GET /api/tickets — cliente vê só os seus; staff (admin/dev) vê todos
 * (regra aplicada em core/services/ticketService.ts).
 */
export async function GET(pedido: Request) {
  try {
    const { perfil, dependencias } = await exigirUtilizador();
    const tickets = await listarTickets(dependencias, perfil);
    return comCors(pedido, NextResponse.json({ tickets }, { status: 200 }));
  } catch (erro) {
    if (erro instanceof ErroAutenticacao) {
      return comCors(pedido, NextResponse.json({ error: erro.message }, { status: erro.estado }));
    }
    console.error("[/api/tickets GET] erro:", erro);
    return comCors(
      pedido,
      NextResponse.json({ error: "Ocorreu um erro a obter os tickets." }, { status: 500 })
    );
  }
}
