import { clsx } from "clsx";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variante = "primary" | "secondary" | "ghost" | "danger";
type Tamanho = "sm" | "md";

interface PropriedadesBotao extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variante;
  size?: Tamanho;
  isLoading?: boolean;
}

const classesVariante: Record<Variante, string> = {
  primary: "bg-ink text-white hover:bg-ink-700 disabled:bg-ink-300",
  secondary:
    "bg-white text-ink border border-ink-100 hover:bg-surface-muted disabled:text-ink-300",
  ghost: "bg-transparent text-ink hover:bg-surface-muted disabled:text-ink-300",
  danger: "bg-danger text-white hover:opacity-90 disabled:opacity-50",
};

const classesTamanho: Record<Tamanho, string> = {
  sm: "text-sm px-3 py-1.5 rounded-lg",
  md: "text-sm px-4 py-2.5 rounded-xl",
};

export const Botao = forwardRef<HTMLButtonElement, PropriedadesBotao>(
  ({ className, variant = "primary", size = "md", isLoading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(
          "inline-flex items-center justify-center gap-2 font-medium",
          "transition-[background-color,color,transform] duration-150 active:scale-[0.97]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:active:scale-100",
          classesVariante[variant],
          classesTamanho[size],
          className
        )}
        {...props}
      >
        {isLoading && (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  }
);
Botao.displayName = "Botao";
