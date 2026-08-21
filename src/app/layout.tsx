import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

// Auto-hospedada pelo Next.js (descarregada em build, servida pelo próprio
// domínio) — mais rápida do que um <link> ao Google Fonts, e não exige abrir
// a Content-Security-Policy a fonts.googleapis.com/fonts.gstatic.com.
// "latin-ext" incluído para os diacríticos do português (ã, õ, ç, …).
const montserrat = Montserrat({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Apoio ao Cliente · Vértice Digital",
  description:
    "Centro de apoio ao cliente da Vértice Digital para clientes com sites institucionais e lojas online.",
  robots: { index: false, follow: false }, // aplicação interna, não indexar
};

export default function LayoutRaiz({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT" className={montserrat.variable}>
      <body>{children}</body>
    </html>
  );
}
