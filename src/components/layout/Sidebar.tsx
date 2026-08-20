"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { clsx } from "clsx";

interface ItemNavegacao {
  href: string;
  rotulo: string;
}

export function BarraLateral({ itens, rotuloMarca }: { itens: ItemNavegacao[]; rotuloMarca: string }) {
  const caminhoAtual = usePathname();
  // Alguns itens (ex.: "Os meus tickets" vs "Fila do departamento" na
  // sidebar do dev) apontam para o MESMO caminho com queries diferentes
  // (?vista=...) — por isso o destaque de "ativo" tem de olhar também para
  // a query, não só para o pathname, senão vários itens ficavam sempre
  // destacados ao mesmo tempo.
  const queryAtual = useSearchParams().toString();

  return (
    <aside className="flex w-56 flex-shrink-0 flex-col border-r border-ink-100 bg-ink text-white">
      <div className="flex items-center gap-2 px-5 py-5">
        {/* eslint-disable-next-line @next/next/no-img-element -- ficheiro estático servido a partir de src/app/icon.png */}
        <img src="/icon.png" alt="Vértice Digital" className="h-8 w-8 rounded-lg" />
        <span className="text-sm font-semibold">{rotuloMarca}</span>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {itens.map((item) => {
          const [caminhoItem, queryItem = ""] = item.href.split("?");
          const ativo = item.href.includes("?")
            ? caminhoAtual === caminhoItem && queryAtual === queryItem
            : (caminhoAtual === caminhoItem || caminhoAtual.startsWith(`${caminhoItem}/`)) && queryAtual === "";
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
