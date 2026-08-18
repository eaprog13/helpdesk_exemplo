import { NextResponse } from "next/server";

function obterOrigensPermitidas(): string[] {
  return (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

/**
 * Aplica CORS explícito e restritivo às rotas de API: só as origens
 * listadas em ALLOWED_ORIGINS podem chamar a API a partir do browser.
 * Uso: no route handler, chamar comCors(pedido, resposta).
 */
export function comCors(pedido: Request, resposta: NextResponse) {
  const origem = pedido.headers.get("origin");
  const permitidas = obterOrigensPermitidas();

  if (origem && permitidas.includes(origem)) {
    resposta.headers.set("Access-Control-Allow-Origin", origem);
    resposta.headers.set("Vary", "Origin");
    resposta.headers.set("Access-Control-Allow-Credentials", "true");
  }

  return resposta;
}

export function respostaPreflightCors(pedido: Request) {
  const resposta = new NextResponse(null, { status: 204 });
  comCors(pedido, resposta);
  resposta.headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  resposta.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  resposta.headers.set("Access-Control-Max-Age", "86400");
  return resposta;
}
