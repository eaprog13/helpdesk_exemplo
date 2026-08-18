import { NextResponse } from "next/server";
import { ErroAutenticacao, exigirUtilizador } from "@/lib/auth/session";
import { comCors, respostaPreflightCors } from "@/lib/security/cors";
import { iniciarNovaConversa } from "@/core/services/chatService";

export const runtime = "nodejs";

export async function OPTIONS(pedido: Request) {
  return respostaPreflightCors(pedido);
}

/**
 * POST /api/chat/conversas — chamado pelo formulário de login logo a seguir
 * a autenticar com sucesso, para que cada início de sessão arranque sempre
 * com uma conversa em branco (as anteriores continuam acessíveis em "Histórico").
 */
export async function POST(pedido: Request) {
  try {
    const { utilizador, dependencias } = await exigirUtilizador();
    const conversa = await iniciarNovaConversa(dependencias, utilizador.id);
    return comCors(pedido, NextResponse.json({ idConversa: conversa.id }, { status: 201 }));
  } catch (erro) {
    if (erro instanceof ErroAutenticacao) {
      return comCors(pedido, NextResponse.json({ error: erro.message }, { status: erro.estado }));
    }
    console.error("[/api/chat/conversas POST] erro:", erro);
    return comCors(pedido, NextResponse.json({ error: "Erro ao iniciar nova conversa." }, { status: 500 }));
  }
}
