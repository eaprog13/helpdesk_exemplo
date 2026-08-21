import { clsx } from "clsx";
import { HTMLAttributes } from "react";

export function Cartao({
  className,
  interativo,
  selecionado,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  /**
   * Movimento ao passar o rato/focar (elevação + sombra + "clique") — só
   * para cartões clicáveis ou que fazem parte de uma lista navegável
   * (tickets, clientes, KB, equipa, estatísticas). Um cartão estático
   * (ex.: formulário de login) não ganha isto — não há nada para
   * "selecionar" nele. O contorno accent ao passar o rato (ver abaixo) é
   * universal, independente disto.
   */
  interativo?: boolean;
  /** Estado "escolhido" (ex.: filtro ativo, item aberto) — anel de destaque, sem depender só da cor. */
  selecionado?: boolean;
}) {
  return (
    <div
      className={clsx(
        // O contorno fica accent/40 (o teal, ligeiramente esverdeado, da
        // marca) ao passar o rato em QUALQUER cartão do projeto — não só
        // nos "interativos" (ver pedido do utilizador, 2026-08-20).
        // Selecionado já tem o próprio contorno accent, sempre visível,
        // por isso não muda mais no hover. Só transform/box-shadow/
        // border-color (GPU, sem reflow); respeita prefers-reduced-motion
        // via globals.css.
        "rounded-xl border bg-surface-card shadow-panel transition-[transform,box-shadow,border-color] duration-200 ease-out",
        selecionado ? "border-accent ring-2 ring-accent/30" : "border-ink-100 hover:border-accent/40",
        interativo && "hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-[0.99]",
        className
      )}
      {...props}
    />
  );
}
