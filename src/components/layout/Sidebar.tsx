"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import type { Departamento } from "@/core/types";

interface ItemNavegacao {
  href: string;
  rotulo: string;
}

// Mesmos valores de dept.* em tailwind.config.ts — precisamos do hex "cru"
// aqui (não só da classe Tailwind) para montar o gradiente inline no topo
// e no fundo da sidebar, que combina as cores de TODOS os departamentos da
// pessoa, não só de um. Manter os dois em sincronia.
const DEPT_HEX: Record<Departamento, string> = {
  desenvolvimento: "#8C3350",
  marketing: "#C06E8A",
  design: "#6D5FB0",
  geral: "#0E8F86",
};

/**
 * Faixa de cor no topo/fundo da sidebar, com o brilho a esbater para
 * transparente em direção ao meio (via mask, não via stops "transparent"
 * no próprio gradiente — assim as cores não ficam amareladas ao misturar).
 * Uma só cor = esbatimento simples; duas ou mais = gradiente horizontal
 * combinando as cores de todos os departamentos da pessoa.
 */
function construirFaixaGradiente(cores: string[], lado: "topo" | "fundo"): CSSProperties {
  if (cores.length === 0) return { display: "none" };
  const paragens = cores.length === 1 ? [cores[0], cores[0]] : cores;
  const mascara = lado === "topo" ? "linear-gradient(to bottom, black, transparent)" : "linear-gradient(to top, black, transparent)";
  return {
    backgroundImage: `linear-gradient(90deg, ${paragens.join(", ")})`,
    WebkitMaskImage: mascara,
    maskImage: mascara,
  };
}

export function BarraLateral({
  itens,
  rotuloMarca,
  papel,
  departamentos,
}: {
  itens: ItemNavegacao[];
  rotuloMarca: string;
  /** Mostra o cargo (Administrador/Developer) por baixo do nome da marca. */
  papel?: "admin" | "dev";
  /**
   * Departamento(s) da pessoa — pinta o topo e o fundo da sidebar com a(s)
   * cor(es) correspondente(s) (ver DEPT_HEX). Um só = a mesma cor esbate
   * no topo e no fundo; exatamente dois = uma cor no topo, a outra no
   * fundo (sem misturar); três ou mais = gradiente combinando as cores de
   * todos, no topo e no fundo.
   */
  departamentos?: Departamento[];
}) {
  const caminhoAtual = usePathname();
  // Alguns itens (ex.: "Os meus tickets" vs "Fila do departamento" na
  // sidebar do dev) apontam para o MESMO caminho com queries diferentes
  // (?vista=...) — por isso o destaque de "ativo" tem de olhar também para
  // a query, não só para o pathname, senão vários itens ficavam sempre
  // destacados ao mesmo tempo.
  const queryAtual = useSearchParams().toString();
  const coresDepartamento = (departamentos ?? []).map((d) => DEPT_HEX[d]);
  // Exatamente 2 departamentos: uma cor pura no topo, a outra pura no
  // fundo (não misturadas) — dá para ver logo quais são os dois. Com 1 ou
  // com 3+, topo e fundo mostram o mesmo conjunto (ver construirFaixaGradiente).
  const coresTopo = coresDepartamento.length === 2 ? coresDepartamento.slice(0, 1) : coresDepartamento;
  const coresFundo = coresDepartamento.length === 2 ? coresDepartamento.slice(1, 2) : coresDepartamento;

  return (
    <aside className="relative flex w-56 flex-shrink-0 flex-col overflow-hidden border-r border-ink-100 bg-ink text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40" style={construirFaixaGradiente(coresTopo, "topo")} aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40" style={construirFaixaGradiente(coresFundo, "fundo")} aria-hidden="true" />
      <div className="relative z-10 flex items-center gap-2 px-5 py-5">
        {/* eslint-disable-next-line @next/next/no-img-element -- ficheiro estático servido a partir de src/app/icon.png */}
        <img src="/icon.png" alt="Vértice Digital" className="h-8 w-8 rounded-lg" />
        <div className="min-w-0">
          <span className="block truncate text-sm font-semibold">{rotuloMarca}</span>
          {papel && (
            <span
              className={clsx(
                "text-[10px] font-semibold uppercase tracking-wide",
                papel === "admin" ? "text-blue-light" : "text-accent-light"
              )}
            >
              {papel === "admin" ? "Administrador" : "Developer"}
            </span>
          )}
        </div>
      </div>
      <nav className="relative z-10 flex-1 space-y-1 px-3">
        {itens.map((item) => {
          const [caminhoItem, queryItem = ""] = item.href.split("?");
          // "/admin" (Resumo) é a raiz de TODOS os outros caminhos desta
          // secção — um startsWith(`${caminhoItem}/`) genérico fazia-o
          // "colar-se" como ativo em qualquer página (/admin/tickets,
          // /admin/dashboard, ...), nunca desligava. Só pode ficar ativo
          // no caminho exato.
          const ativo = item.href.includes("?")
            ? caminhoAtual === caminhoItem && queryAtual === queryItem
            : caminhoItem === "/admin"
              ? caminhoAtual === "/admin" && queryAtual === ""
              : (caminhoAtual === caminhoItem || caminhoAtual.startsWith(`${caminhoItem}/`)) && queryAtual === "";
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "relative block rounded-lg px-3 py-2 text-sm transition-colors",
                ativo ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
              )}
            >
              {/* Fio condutor da marca (ver identidade visual) — só no item
                  ativo, nunca decorativo solto: assinala "está aqui". */}
              {ativo && <span className="absolute inset-y-1 -left-2 w-[3px] rounded-full bg-thread" aria-hidden="true" />}
              {item.rotulo}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
