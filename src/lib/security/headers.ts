/**
 * Cabeçalhos de segurança equivalentes ao "helmet" do Express, aplicados
 * via middleware.ts a todas as respostas (Next.js/Vercel corre em ambiente
 * serverless/edge, onde o middleware do Express não se aplica — isto é o
 * mecanismo nativo recomendado para o mesmo efeito).
 */
export function construirCabecalhosSeguranca(nonce: string) {
  const csp = [
    "default-src 'self'",
    // 'nonce' permite scripts inline gerados pelo próprio Next.js sem abrir mão do CSP
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'", // Tailwind injeta estilos inline em dev
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  return {
    "Content-Security-Policy": csp,
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    // microphone=(self): o ditado por voz do chat (ver ChatInput.tsx, Web
    // Speech API) precisa de acesso ao microfone no próprio site — com
    // "()" (ninguém, nem self) o browser bloqueia o pedido antes de sequer
    // chegar à permissão do site, dando sempre "not-allowed" mesmo com o
    // microfone autorizado nas definições do browser. Câmara/geolocalização/
    // pagamentos continuam bloqueados: nada na app os usa.
    "Permissions-Policy": "camera=(), microphone=(self), geolocation=(), payment=()",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    "X-DNS-Prefetch-Control": "off",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
  };
}
