import type { CookieOptions } from "@supabase/ssr";

/**
 * O @supabase/ssr define, por omissão, "httpOnly: false" nos cookies de
 * sessão (ver node_modules/@supabase/ssr/dist/main/utils/constants.js,
 * DEFAULT_COOKIE_OPTIONS — confirmado no código instalado) — para o caso de
 * o cliente de browser precisar de os ler via document.cookie. Esta app
 * nunca faz isso, a sessão só é lida no servidor (ver
 * src/lib/supabase/server.ts e proxy.ts). Reforçamos aqui: "httpOnly"
 * bloqueia leitura por JavaScript no browser (mitiga roubo de sessão via
 * XSS) sem quebrar nada, e "secure" impede o cookie de ser enviado fora de
 * HTTPS. Mesmo padrão usado em gestor_financeiro/gestor_investimento.
 */
export function comSegurancaReforcada(opcoes: CookieOptions): CookieOptions {
  return {
    ...opcoes,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };
}
