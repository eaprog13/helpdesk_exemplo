import type { Config } from "tailwindcss";

// Paleta da Vértice:
// - Texto/marca:  #09182A (azul-petróleo muito escuro)
// - Fundo:        neutro claro e profissional (cinza-azulado suave, não branco puro)
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
          DEFAULT: "#0F6E8C", // azul-petróleo médio, deriva da cor de marca, para CTAs
          hover: "#0C5A72",
          light: "#E4F1F5",
        },
        success: "#1E7F4C",
        warning: "#B4790A",
        danger: "#B42323",
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
