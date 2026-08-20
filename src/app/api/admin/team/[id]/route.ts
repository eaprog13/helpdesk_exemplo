import { NextResponse } from "next/server";
import { z } from "zod";
import { ErroAutenticacao, exigirPapel } from "@/lib/auth/session";
import { comCors, respostaPreflightCors } from "@/lib/security/cors";
import { ErroNaoEncontrado } from "@/core/services/chatService";
import { atualizarMembroEquipa } from "@/core/services/teamService";

export const runtime = "nodejs";

export async function OPTIONS(pedido: Request) {
  return respostaPreflightCors(pedido);
}

const esquemaAlteracoes = z.object({
  role: z.enum(["dev", "admin"]).optional(),
  departamentos: z.array(z.enum(["desenvolvimento", "marketing", "design", "geral"])).max(4).optional(),
});

/**
 * PATCH /api/admin/team/:id — apenas 'admin'. Corrige role e/ou
 * departamento(s) de um membro de equipa já existente (ver
 * teamService.ts, atualizarMembroEquipa).
 */
export async function PATCH(pedido: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { dependencias } = await exigirPapel(["admin"]);

    const corpo = await pedido.json();
    const dadosValidados = esquemaAlteracoes.safeParse(corpo);
    if (!dadosValidados.success) {
      return comCors(
        pedido,
        NextResponse.json({ error: dadosValidados.error.errors[0]?.message }, { status: 400 })
      );
    }

    const membro = await atualizarMembroEquipa(dependencias, id, dadosValidados.data);
    return comCors(pedido, NextResponse.json({ membro }, { status: 200 }));
  } catch (erro) {
    if (erro instanceof ErroAutenticacao) {
      return comCors(pedido, NextResponse.json({ error: erro.message }, { status: erro.estado }));
    }
    if (erro instanceof ErroNaoEncontrado) {
      return comCors(pedido, NextResponse.json({ error: erro.message }, { status: 404 }));
    }
    console.error("[/api/admin/team/:id PATCH] erro:", erro);
    return comCors(pedido, NextResponse.json({ error: "Erro ao atualizar o membro da equipa." }, { status: 500 }));
  }
}
