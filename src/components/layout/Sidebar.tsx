"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

interface ItemNavegacao {
  href: string;
  rotulo: string;
}

export function BarraLateral({ itens, rotuloMarca }: { itens: ItemNavegacao[]; rotuloMarca: string }) {
  const caminhoAtual = usePathname();

  return (
    <aside className="flex w-56 flex-shrink-0 flex-col border-r border-ink-100 bg-ink text-white">
      <div className="flex items-center gap-2 px-5 py-5">
        {/* eslint-disable-next-line @next/next/no-img-element -- ficheiro estático servido a partir de src/app/icon.png */}
        <img src="/icon.png" alt="Vértice Digital" className="h-8 w-8 rounded-lg" />
        <span className="text-sm font-semibold">{rotuloMarca}</span>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {itens.map((item) => {
          const ativo = caminhoAtual === item.href || caminhoAtual.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "block rounded-lg px-3 py-2 text-sm transition-colors",
                ativo ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
              )}
            >
              {item.rotulo}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
