import { clsx } from "clsx";
import { InputHTMLAttributes, forwardRef } from "react";

export const Campo = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={clsx(
        "w-full rounded-lg border border-ink-100 bg-white px-3.5 py-2.5 text-sm text-ink",
        "transition-[box-shadow,border-color] duration-150",
        "placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent",
        "disabled:bg-surface-muted disabled:text-ink-300",
        className
      )}
      {...props}
    />
  )
);
Campo.displayName = "Campo";
