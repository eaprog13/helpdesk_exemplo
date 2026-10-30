import { NextResponse } from "next/server";
import { z } from "zod";
import { ErroAutenticacao, exigirUtilizador } from "@/lib/auth/session";
import { comCors, respostaPreflightCors } from "@/lib/security/cors";
import { verificarLimiteTaxa } from "@/lib/security/rateLimit";
import { fazerPergunta, obterConversaMaisRecente, ErroNaoEncontrado } from "@/core/services/chatService";

export const runtime = "nodejs";

const esquemaCorpo = z.object({
  // .nullable() além de .optional(): o browser envia idConversa: null
  // explicitamente antes de existir conversa (ver ChatWindow.tsx), não
  // "campo ausente" — só .optional() rejeitava esse null com "Expected
  // string, received null".
  idConversa: z.string().uuid().nullable().optional(),
  pergunta: z.string().min(3, "A pergunta é demasiado curta.").max(4000),
});

export async function OPTIONS(pedido: Request) {
  return respostaPreflightCors(pedido);
}

/** GET /api/chat — histórico da conversa mais recente, para restaurar o chat ao abrir a página. */
export async function GET(pedido: Request) {
  try {
    const { utilizador, dependencias } = await exigirUtilizador();
    const resultado = await obterConversaMaisRecente(dependencias, utilizador.id);
    return comCors(pedido, NextResponse.json(resultado, { status: 200 }));
  } catch (erro) {
    if (erro instanceof ErroAutenticacao) {
      return comCors(pedido, NextResponse.json({ error: erro.message }, { status: erro.estado }));
    }
    console.error("[/api/chat GET] erro:", erro);
    return comCors(
      pedido,
      NextResponse.json({ error: "Ocorreu um erro a carregar a conversa." }, { status: 500 })
    );
  }
}

/**
 * POST /api/chat — o cliente faz uma pergunta. Toda a lógica (verificar o
 * histórico, pesquisar a base de conhecimento, cair para a LLM, abrir
 * ticket, notificar) vive em core/services/chatService.ts; esta rota só
 * valida o pedido HTTP e traduz o resultado/erros para respostas HTTP.
 */
export async function POST(pedido: Request) {
  try {
    const { utilizador, perfil, dependencias } = await exigirUtilizador();

    const { sucesso } = await verificarLimiteTaxa(`chat:${utilizador.id}`);
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
    const dadosValidados = esquemaCorpo.safeParse(corpo);
    if (!dadosValidados.success) {
      return comCors(
        pedido,
        NextResponse.json({ error: dadosValidados.error.issues[0]?.message }, { status: 400 })
      );
    }

    const resultado = await fazerPergunta(dependencias, {
      utilizador,
      perfil,
      pergunta: dadosValidados.data.pergunta,
      idConversa: dadosValidados.data.idConversa ?? undefined,
    });

    return comCors(pedido, NextResponse.json(resultado, { status: 200 }));
  } catch (erro) {
    if (erro instanceof ErroAutenticacao) {
      return comCors(pedido, NextResponse.json({ error: erro.message }, { status: erro.estado }));
    }
    if (erro instanceof ErroNaoEncontrado) {
      return comCors(pedido, NextResponse.json({ error: erro.message }, { status: 404 }));
    }
    console.error("[/api/chat POST] erro:", erro);
    return comCors(
      pedido,
      NextResponse.json({ error: "Ocorreu um erro a processar o seu pedido." }, { status: 500 })
    );
  }
}
