import { NextResponse } from "next/server";
import { z } from "zod";
import { ErroAutenticacao, exigirUtilizador } from "@/lib/auth/session";
import { comCors, respostaPreflightCors } from "@/lib/security/cors";
import { alterarPalavraPasse } from "@/core/services/authService";

export const runtime = "nodejs";

export async function OPTIONS(pedido: Request) {
  return respostaPreflightCors(pedido);
}

const esquema = z.object({
  novaPalavraPasse: z
    .string()
    .min(10, "A password deve ter pelo menos 10 caracteres.")
    .max(128)
    .regex(/[A-Z]/, "Deve incluir pelo menos uma letra maiúscula.")
    .regex(/[a-z]/, "Deve incluir pelo menos uma letra minúscula.")
    .regex(/[0-9]/, "Deve incluir pelo menos um número."),
});

/** POST /api/auth/change-password — o próprio utilizador define uma nova password (obrigatório no 1º acesso). */
export async function POST(pedido: Request) {
  try {
    const { utilizador, dependencias } = await exigirUtilizador();
    const corpo = await pedido.json();
    const dadosValidados = esquema.safeParse(corpo);
    if (!dadosValidados.success) {
      return comCors(
        pedido,
        NextResponse.json({ error: dadosValidados.error.issues[0]?.message }, { status: 400 })
      );
    }

    await alterarPalavraPasse(dependencias, utilizador.id, dadosValidados.data.novaPalavraPasse);
    return comCors(pedido, NextResponse.json({ ok: true }, { status: 200 }));
  } catch (erro) {
    if (erro instanceof ErroAutenticacao) {
      return comCors(pedido, NextResponse.json({ error: erro.message }, { status: erro.estado }));
    }
    console.error("[/api/auth/change-password] erro:", erro);
    return comCors(pedido, NextResponse.json({ error: "Erro ao alterar a password." }, { status: 500 }));
  }
}
