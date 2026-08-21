/**
 * Confirmação animada (círculo + "check" a desenhar-se) — o momento de
 * "isto correu bem" da identidade visual: ticket resolvido, conta criada,
 * ação concluída. Desenhado em SVG puro (stroke-dashoffset), sem depender
 * de nenhum ficheiro externo (Lottie incluiria um asset que o CSP dos
 * artefactos/algumas páginas não pode carregar de fora) — o gradiente
 * ink→accent→blue ecoa o próprio símbolo "e" da marca.
 *
 * Desenha-se uma vez ao aparecer e para — combina com a política de
 * animação do resto da app (ver globals.css, .animate-entrada: "nada em
 * loop contínuo a consumir ciclos em segundo plano").
 */
export function VerificacaoAnimada({ tamanho = 40, className }: { tamanho?: number; className?: string }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      <circle
        cx="20"
        cy="20"
        r="18"
        stroke="url(#verificacao-gradiente)"
        strokeWidth="2.5"
        strokeLinecap="round"
        style={{ strokeDasharray: 113, animation: "verificacao-circulo 0.6s cubic-bezier(0.16, 1, 0.3, 1) both" }}
      />
      <path
        d="M12 20.5l5.2 5.2L28.5 14.5"
        stroke="url(#verificacao-gradiente)"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ strokeDasharray: 26, animation: "verificacao-check 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.35s both" }}
      />
      <defs>
        <linearGradient id="verificacao-gradiente" x1="0" y1="0" x2="40" y2="40">
          <stop stopColor="#08869C" />
          <stop offset="1" stopColor="#1A70E2" />
        </linearGradient>
      </defs>
      <style>{`
        @keyframes verificacao-circulo { from { stroke-dashoffset: 113; } to { stroke-dashoffset: 0; } }
        @keyframes verificacao-check { from { stroke-dashoffset: 26; } to { stroke-dashoffset: 0; } }
        @media (prefers-reduced-motion: reduce) {
          circle, path { animation: none !important; stroke-dashoffset: 0 !important; }
        }
      `}</style>
    </svg>
  );
}
