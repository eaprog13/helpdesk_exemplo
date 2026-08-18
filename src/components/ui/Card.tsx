import { clsx } from "clsx";
import { HTMLAttributes } from "react";

export function Cartao({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded-xl border border-ink-100 bg-surface-card shadow-panel",
        className
      )}
      {...props}
    />
  );
}
