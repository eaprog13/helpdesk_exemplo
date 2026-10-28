import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { construirCabecalhosSeguranca } from "@/lib/security/headers";
import { comSegurancaReforcada } from "@/lib/security/cookies";

const CAMINHOS_PUBLICOS = ["/login", "/forgot-password", "/api/auth"];

// 30 minutos sem nenhum pedido — ver secção "Timeout de sessão por
// inatividade" abaixo.
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

function ehCaminhoPublico(caminho: string) {
  return (
    CAMINHOS_PUBLICOS.some((p) => caminho === p || caminho.startsWith(`${p}/`)) ||
    caminho.startsWith("/_next") ||
    caminho === "/favicon.ico"
  );
}

export async function proxy(pedido: NextRequest) {
  const nonce = crypto.randomUUID();
  const cabecalhosSeguranca = construirCabecalhosSeguranca(nonce);

  // Reencaminhar a CSP (com o nonce) também nos headers do PEDIDO, não só
  // na resposta — é assim que o Next.js sabe que nonce aplicar aos scripts
  // que ele próprio gera (framework, hydration, bundle de cada página). Sem
  // isto, o CSP acima bloqueava os próprios scripts do Next.js (nenhum
  // tinha o atributo nonce), a app ficava sem JS a correr e nada abaixo do
  // HTML estático (ex.: o formulário de login) chegava a aparecer. Ver doc
  // do Next.js: "Content Security Policy" > Nonces > "How nonces work".
  const cabecalhosPedido = new Headers(pedido.headers);
  cabecalhosPedido.set("x-nonce", nonce);
  cabecalhosPedido.set("Content-Security-Policy", cabecalhosSeguranca["Content-Security-Policy"]);

  const resposta = NextResponse.next({
    request: { headers: cabecalhosPedido },
  });

  // ── 1) Cabeçalhos de segurança em todas as respostas ──────────────────
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
          resposta.cookies.set({ name: nome, value: valor, ...comSegurancaReforcada(opcoes) });
        },
        remove(nome: string, opcoes: CookieOptions) {
          resposta.cookies.set({ name: nome, value: "", ...comSegurancaReforcada(opcoes) });
        },
      },
    }
  );

  const {
    data: { user: utilizadorSupabase },
  } = await supabase.auth.getUser();
  let utilizador = utilizadorSupabase;

  // ── 2.1) Timeout de sessão por inatividade ────────────────────────────
  // O Supabase, por si só, não desloga por inatividade — o refresh token
  // renova-se sozinho enquanto o browser continuar a fazer pedidos, mesmo
  // ao fim de dias. Guardamos a hora do último pedido autenticado num
  // cookie próprio; se passar mais de INACTIVITY_TIMEOUT_MS sem nenhum
  // pedido, força logout e exige novo login, mesmo que o token Supabase em
  // si ainda fosse válido.
  if (utilizador) {
    const ultimaAtividade = Number(pedido.cookies.get("last_activity")?.value ?? 0);
    const inativoDemasiadoTempo = ultimaAtividade > 0 && Date.now() - ultimaAtividade > INACTIVITY_TIMEOUT_MS;

    if (inativoDemasiadoTempo) {
      await supabase.auth.signOut();
      utilizador = null;
      resposta.cookies.delete("last_activity");
    } else {
      resposta.cookies.set({
        name: "last_activity",
        value: String(Date.now()),
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: INACTIVITY_TIMEOUT_MS / 1000,
      });
    }
  }

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
    {
      /*
       * Aplicar a tudo exceto assets estáticos internos do Next.js e
       * ficheiros estáticos (public/, ícones de metadata do App Router como
       * src/app/icon.png, fontes, etc.) — sem isto, um pedido não autenticado
       * a um destes ficheiros era redirecionado para /login (que devolve
       * HTML, não a imagem), partindo o logótipo em todo o lado onde
       * aparecia antes de autenticar (ex.: a própria página de login).
       * Confirmado só em produção (`next start`) — em `next dev`/Turbopack
       * os assets de public/ não passavam pelo proxy, por isso nunca
       * se via o problema em desenvolvimento.
       */
      source:
        "/((?!_next/static|_next/image|favicon\\.ico|icon|apple-icon|opengraph-image|twitter-image|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|txt|xml|woff2?|ttf)$).*)",
      // Um prefetch (hover num <Link>, navegação especulativa) não precisa
      // de renovar sessão nem escrever o cookie "last_activity" — só a
      // navegação real que o utilizador de facto faz. Mesmo padrão usado em
      // gestor_financeiro/gestor_investimento.
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
