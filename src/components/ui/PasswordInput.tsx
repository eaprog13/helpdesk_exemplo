"use client";

import { clsx } from "clsx";
import { useState, forwardRef, type InputHTMLAttributes, type SVGProps } from "react";
import { Campo } from "./Input";

// Mesmo estilo de traço dos ícones em components/chat/QuickActionCards.tsx
// (stroke, sem preenchimento) — para os dois lerem como o mesmo sistema.
function IconeOlho(p: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M2 12S5.5 5 12 5s10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconeOlhoFechado(p: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="M6.6 6.6C4 8.3 2 12 2 12s3.5 7 10 7c1.6 0 3-.4 4.2-.9" />
      <path d="M10.6 5.1c.5-.07 1-.1 1.4-.1 6.5 0 10 7 10 7a13.2 13.2 0 0 1-3 3.9" />
      <path d="M3 3l18 18" />
    </svg>
  );
}

/**
 * Campo de password com botão para mostrar/ocultar os carateres — o botão
 * só troca o "type" do input (password ↔ text), nunca chega a existir uma
 * cópia da password em mais lado nenhum. Usado em qualquer ecrã com
 * password (login, recuperação, primeiro acesso) para o mesmo
 * comportamento em todo o lado, em vez de reescrever isto em cada formulário.
 */
export const CampoPassword = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    const [visivel, setVisivel] = useState(false);

    return (
      <div className="relative">
        <Campo ref={ref} type={visivel ? "text" : "password"} className={clsx("pr-11", className)} {...props} />
        <button
          type="button"
          onClick={() => setVisivel((anterior) => !anterior)}
          // tabIndex -1: não interrompe a navegação por Tab entre os campos
          // do formulário — é um atalho visual, não um passo do preenchimento.
          tabIndex={-1}
          aria-label={visivel ? "Ocultar password" : "Mostrar password"}
          aria-pressed={visivel}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-ink-300 transition-colors duration-150 hover:text-ink-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded-r-lg"
        >
          {visivel ? <IconeOlhoFechado className="h-4 w-4" /> : <IconeOlho className="h-4 w-4" />}
        </button>
      </div>
    );
  }
);
CampoPassword.displayName = "CampoPassword";
