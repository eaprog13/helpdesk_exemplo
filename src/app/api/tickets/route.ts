import { NextResponse } from "next/server";
import { z } from "zod";
import { ErroAutenticacao, exigirUtilizador } from "@/lib/auth/session";
import { comCors, respostaPreflightCors } from "@/lib/security/cors";
import { verificarLimiteTaxa } from "@/lib/security/rateLimit";
import { abrirTicketManual, listarTickets } from "@/core/services/ticketService";

export const runtime = "nodejs";

const esquemaCriacao = z.object({
  titulo: z.string().trim().min(3, "O título é demasiado curto.").max(120),
  descricao: z.string().trim().min(10, "Descreva o pedido com mais detalhe.").max(4000),
  // null = "não tenho a certeza" — cai em "Por triar", ver abrirTicketManual.
  departamento: z.enum(["desenvolvimento", "marketing", "design", "geral"]).nullable(),
});

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

/**
 * POST /api/tickets — o cliente abre um ticket diretamente, sem passar
 * pelo chat. Toda a lógica (associar à conversa, notificar) vive em
 * core/services/ticketService.ts (abrirTicketManual); esta rota só valida
 * o pedido HTTP e traduz o resultado/erros para respostas HTTP.
 */
export async function POST(pedido: Request) {
  try {
    const { utilizador, perfil, dependencias } = await exigirUtilizador();

    const { sucesso } = await verificarLimiteTaxa(`tickets:${utilizador.id}`);
    if (!sucesso) {
      return comCors(
        pedido,
        NextResponse.json(
          { error: "Demasiados pedidos. Tente novamente dentro de instantes." },
          { status: 429 }
        )
      );
    }

    const corpo = await pedido.json();
    const dadosValidados = esquemaCriacao.safeParse(corpo);
    if (!dadosValidados.success) {
      return comCors(
        pedido,
        NextResponse.json({ error: dadosValidados.error.issues[0]?.message }, { status: 400 })
      );
    }

    const ticket = await abrirTicketManual(dependencias, utilizador, perfil, dadosValidados.data);
    return comCors(pedido, NextResponse.json({ ticket }, { status: 201 }));
  } catch (erro) {
    if (erro instanceof ErroAutenticacao) {
      return comCors(pedido, NextResponse.json({ error: erro.message }, { status: erro.estado }));
    }
    console.error("[/api/tickets POST] erro:", erro);
    return comCors(
      pedido,
      NextResponse.json({ error: "Ocorreu um erro a abrir o ticket." }, { status: 500 })
    );
  }
}
