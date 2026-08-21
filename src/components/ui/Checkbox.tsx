import { clsx } from "clsx";
import { InputHTMLAttributes } from "react";

/**
 * Checkbox com tamanho fixo (nunca "cresce" com o texto da label) e cor da
 * marca (accent) — antes cada grupo (Serviço(s), Departamento, Tipo(s) de
 * site…) usava um <input type="checkbox"> em bruto, dentro de um
 * flex-wrap: como cada label tinha um comprimento diferente, os
 * quadradinhos acabavam desalinhados entre si. Usar sempre isto dentro de
 * um grid (ver GrupoCaixasSelecao) resolve os dois problemas de uma vez.
 */
export function CaixaSelecao({
  rotulo,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { rotulo: string }) {
  return (
    <label className={clsx("flex items-center gap-2 text-sm text-ink-400", className)}>
      <input type="checkbox" className="h-4 w-4 shrink-0 rounded border-ink-200 accent-accent" {...props} />
      {rotulo}
    </label>
  );
}

/** Grelha de 2 colunas — os quadrados ficam alinhados em coluna, não espalhados como num flex-wrap. */
export function GrupoCaixasSelecao({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={clsx("grid grid-cols-2 gap-x-4 gap-y-2", className)}>{children}</div>;
}
