import { clsx } from "clsx";

const estilosEstado: Record<string, string> = {
  open: "bg-warning/10 text-warning",
  in_progress: "bg-accent-light text-accent-hover",
  resolved: "bg-success/10 text-success",
  closed: "bg-ink-100 text-ink-400",
  low: "bg-ink-50 text-ink-400",
  normal: "bg-accent-light text-accent-hover",
  high: "bg-warning/10 text-warning",
  urgent: "bg-danger/10 text-danger",
};

const rotulosEstado: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em curso",
  resolved: "Resolvido",
  closed: "Fechado",
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

export function Distintivo({ value }: { value: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        estilosEstado[value] ?? "bg-ink-100 text-ink-400"
      )}
    >
      {rotulosEstado[value] ?? value}
    </span>
  );
}
