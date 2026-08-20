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
 *
 * Só faz sentido para clientes: staff (admin/dev) nunca usa o chat/histórico
 * (é redirecionado para /admin em src/app/(app)/layout.tsx), mas o
 * formulário de login chama este endpoint para QUALQUER login com sucesso
 * — sem este filtro, cada login de admin/dev criava uma conversa vazia e
 * órfã em "conversations" (encontradas várias durante testes: só ocupam
 * espaço, nunca aparecem em lado nenhum da interface).
 */
export async function POST(pedido: Request) {
  try {
    const { utilizador, perfil, dependencias } = await exigirUtilizador();
    if (perfil.role !== "client") {
      return comCors(pedido, NextResponse.json({ idConversa: null }, { status: 200 }));
    }
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
