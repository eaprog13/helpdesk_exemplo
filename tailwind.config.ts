import type { Config } from "tailwindcss";

// Paleta da Vértice — do manual de normas gráficas (2026-08-20):
// - Ink   #09182A — texto/marca (já era esta cor, mantém-se)
// - Accent #08869C — ação (CTAs, links, foco)
// - Blue  #1A70E2 — segunda cor da marca, só para o "fio condutor"
//   (gradiente ink→accent→blue, o mesmo do símbolo "e") — nunca decorativa
//   solta, ver ThreadBar em components/ui/ThreadBar.tsx.
// - Fundo: continua neutro e claro (cinza-azulado suave, não branco puro)
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#09182A",
          50: "#EEF2F6",
          100: "#DCE3EB",
          200: "#B4C2D1",
          300: "#8CA1B7",
          400: "#4F6883",
          500: "#2C4A66",
          600: "#0C2136",
          700: "#0A1B2D",
          800: "#081524",
          900: "#09182A",
          950: "#050D17",
        },
        surface: {
          DEFAULT: "#F4F6F8", // fundo geral, neutro e claro
          muted: "#E8ECF0",
          card: "#FFFFFF",
        },
        accent: {
          DEFAULT: "#08869C", // teal, para CTAs, links, foco
          hover: "#076E80",
          light: "#E1F2F4",
        },
        blue: {
          DEFAULT: "#1A70E2", // segunda cor da marca — só no fio condutor, nunca em botões/texto de corpo
          hover: "#155BB8",
          light: "#E7F0FD",
        },
        success: "#1E7F4C",
        warning: "#B4790A",
        danger: "#B42323",
        // Paleta própria dos DEPARTAMENTOS (Distintivo em components/ui/Badge.tsx)
        // — deliberadamente longe, em matiz, de success/warning/danger/accent:
        // essas já servem estado do ticket (aberto/em curso/resolvido/fechado)
        // e prioridade. Um cartão de ticket mostra departamento + prioridade +
        // estado lado a lado — se partilhassem cor, "Desenvolvimento" (accent)
        // ao lado de "Em curso" (também accent) lia-se como a mesma coisa.
        // Sóbrias (baixa saturação), nunca as cores vivas do resto da app.
        // Paleta de departamentos (2026-08-20, ajustada) — Desenvolvimento a
        // bordeaux (pedido do utilizador), Marketing/Design suavizados (a
        // versão anterior — bordeaux-rosa/ametista — foi considerada
        // "berrante" demais); Geral mantém-se. Validada com o dataviz
        // skill (validate_palette.js, --mode light) — banda de
        // luminosidade, piso de croma, separação CVD e piso de visão
        // normal todos PASS.
        dept: {
          dev: "#8C3350", // Desenvolvimento — bordeaux
          marketing: "#C06E8A", // Marketing Digital — rosa suave
          design: "#6D5FB0", // Branding/Design — violeta suave
          geral: "#0E8F86", // Geral — verde-azulado escuro
        },
        // Paleta própria da PRIORIDADE — uma rampa de intensidade (não 4
        // matizes soltos como departamento/estado), para se ler como o que
        // é: uma escala a subir, não uma categoria qualquer. Culmina no
        // "danger" já existente (urgente = vermelho é convenção universal
        // — mantido de propósito), sem tocar em amber/teal/green (estado)
        // nem em índigo/magenta/violeta/taupe (departamento).
        prio: {
          low: "#A88B7D",
          normal: "#B06B3F",
          high: "#C24A1F",
        },
      },
      backgroundImage: {
        // O gradiente do próprio símbolo "e" — usado só nos 3 pontos do fio
        // condutor (ver components/ui/ThreadBar.tsx): item ativo, separador
        // de secção, confirmação. Nunca como fundo decorativo de página/cartão.
        thread: "linear-gradient(135deg, #09182A 0%, #08869C 55%, #1A70E2 100%)",
      },
      fontFamily: {
        // var(--font-montserrat) é definida em src/app/layout.tsx via next/font/google;
        // a lista a seguir só entra em ação se essa variável falhar por algum motivo.
        sans: [
          "var(--font-montserrat)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        panel: "0 1px 2px 0 rgba(9, 24, 42, 0.06), 0 1px 3px 0 rgba(9, 24, 42, 0.08)",
      },
      borderRadius: {
        xl: "0.875rem",
      },
    },
  },
  plugins: [],
};

export default config;
