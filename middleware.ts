import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { construirCabecalhosSeguranca } from "@/lib/security/headers";

const CAMINHOS_PUBLICOS = ["/login", "/api/auth"];

function ehCaminhoPublico(caminho: string) {
  return (
    CAMINHOS_PUBLICOS.some((p) => caminho === p || caminho.startsWith(`${p}/`)) ||
    caminho.startsWith("/_next") ||
    caminho === "/favicon.ico"
  );
}

export async function middleware(pedido: NextRequest) {
  const nonce = crypto.randomUUID();
  const resposta = NextResponse.next({
    request: { headers: pedido.headers },
  });

  // ── 1) Cabeçalhos de segurança em todas as respostas ──────────────────
  const cabecalhosSeguranca = construirCabecalhosSeguranca(nonce);
  for (const [chave, valor] of Object.entries(cabecalhosSeguranca)) {
    resposta.headers.set(chave, valor);
  }

  // ── 2) Renovar sessão Supabase (necessário em cada pedido para manter
  //       os cookies de sessão atualizados em Server Components) ────────
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(nome: string) {
          return pedido.cookies.get(nome)?.value;
        },
        set(nome: string, valor: string, opcoes: CookieOptions) {
          resposta.cookies.set({ name: nome, value: valor, ...opcoes });
        },
        remove(nome: string, opcoes: CookieOptions) {
          resposta.cookies.set({ name: nome, value: "", ...opcoes });
        },
      },
    }
  );

  const {
    data: { user: utilizador },
  } = await supabase.auth.getUser();

  const { pathname: caminho } = pedido.nextUrl;

  // ── 3) Proteger rotas: sem sessão válida, sem acesso à aplicação ──────
  // Rotas /api/* não são redirecionadas para /login (isso devolveria HTML a
  // um fetch() que espera JSON); ficam a passar e cada route handler chama
  // exigirUtilizador()/exigirPapel(), devolvendo 401/403 em JSON como esperado.
  if (!utilizador && !ehCaminhoPublico(caminho) && !caminho.startsWith("/api/")) {
    const urlLogin = new URL("/login", pedido.url);
    urlLogin.searchParams.set("redirectTo", caminho);
    return NextResponse.redirect(urlLogin);
  }

  // Utilizador autenticado a tentar aceder à página de login → mandar para a app
  if (utilizador && caminho === "/login") {
    return NextResponse.redirect(new URL("/chat", pedido.url));
  }

  return resposta;
}

export const config = {
  matcher: [
    /*
     * Aplicar a tudo exceto assets estáticos internos do Next.js.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
