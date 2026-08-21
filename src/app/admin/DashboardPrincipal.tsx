"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { Cartao } from "@/components/ui/Card";
import type { EstatisticasTickets, ContagemEstados } from "@/core/services/ticketService";
import type { Departamento } from "@/core/types";

function formatarDuracao(ms: number): string {
  const horas = ms / 3_600_000;
  if (horas < 1) return `${Math.max(1, Math.round(ms / 60_000))} min`;
  if (horas < 48) return `${Math.round(horas)}h`;
  const dias = horas / 24;
  return `${dias.toFixed(1).replace(".0", "")} dias`;
}

const ROTULO_DEPARTAMENTO: Record<Departamento, string> = {
  desenvolvimento: "Desenvolvimento",
  marketing: "Marketing Digital",
  design: "Branding/Design",
  geral: "Geral",
};

// Mesmas classes dept.* usadas em components/ui/Badge.tsx — reaproveitar
// aqui em vez de duplicar hex, para nunca desalinhar da paleta oficial.
const CLASSES_DEPARTAMENTO: Record<Departamento, { texto: string; ponto: string }> = {
  desenvolvimento: { texto: "text-dept-dev", ponto: "bg-dept-dev" },
  marketing: { texto: "text-dept-marketing", ponto: "bg-dept-marketing" },
  design: { texto: "text-dept-design", ponto: "bg-dept-design" },
  geral: { texto: "text-dept-geral", ponto: "bg-dept-geral" },
};

function classePill(ativo: boolean) {
  return clsx(
    "rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150",
    ativo ? "border-accent bg-accent-light text-accent-hover" : "border-ink-100 text-ink-400 hover:text-ink"
  );
}

function CartaoEstatistica({
  rotulo,
  valor,
  sufixo,
  corTexto,
  descricao,
  atraso,
}: {
  rotulo: string;
  valor: number | string;
  sufixo?: string;
  corTexto?: string;
  descricao: string;
  atraso: number;
}) {
  return (
    <Cartao interativo className="animate-entrada p-5" style={{ animationDelay: `${atraso}ms` }}>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-300">{rotulo}</p>
      <p className={`mt-1.5 text-3xl font-semibold ${corTexto ?? "text-ink"}`}>
        {valor}
        {sufixo}
      </p>
      <p className="mt-1 text-xs text-ink-400">{descricao}</p>
    </Cartao>
  );
}

/** Barra horizontal com a distribuição aberto/em curso/resolvido/fechado — a "dinâmica" de apresentar estado em vez de só números soltos. */
function FaixaEstados({ estados, atraso = 0 }: { estados: ContagemEstados; atraso?: number }) {
  const total = Math.max(estados.total, 1);
  const segmentos = [
    { chave: "aberto", valor: estados.aberto, cor: "bg-warning", rotulo: "Aberto" },
    { chave: "emCurso", valor: estados.emCurso, cor: "bg-accent", rotulo: "Em curso" },
    { chave: "resolvido", valor: estados.resolvido, cor: "bg-success", rotulo: "Resolvido" },
    { chave: "fechado", valor: estados.fechado, cor: "bg-ink-300", rotulo: "Fechado" },
  ] as const;
  return (
    <div>
      <div className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full bg-surface-muted">
        {segmentos.map(
          (s) =>
            s.valor > 0 && (
              <div
                key={s.chave}
                className={clsx("barra-cresce h-full rounded-full", s.cor)}
                style={{ width: `${(s.valor / total) * 100}%`, animationDelay: `${atraso}ms` }}
                title={`${s.rotulo}: ${s.valor}`}
              />
            )
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-400">
        {segmentos.map((s) => (
          <span key={s.chave} className="inline-flex items-center gap-1.5">
            <span className={clsx("h-2 w-2 rounded-full", s.cor)} aria-hidden="true" />
            {s.rotulo} · {s.valor}
          </span>
        ))}
      </div>
    </div>
  );
}

type Aba = "global" | "departamento" | "individual";

export function PainelPrincipal({ estatisticas, papel }: { estatisticas: EstatisticasTickets; papel: "admin" | "dev" }) {
  const temGlobal = estatisticas.global !== null;
  const [aba, setAba] = useState<Aba>(temGlobal ? "global" : "departamento");
  // Filtro partilhado entre "Por departamento" (clicar num cartão
  // seleciona-o) e "Individual" (a lista de pessoas passa a mostrar só
  // quem pertence a esse departamento) — ver pedido do utilizador
  // (2026-08-20): "filtrar as informações por departamento".
  const [filtroDept, setFiltroDept] = useState<Departamento | "todos">("todos");

  const abas: { chave: Aba; rotulo: string }[] = [
    ...(temGlobal ? [{ chave: "global" as const, rotulo: "Global" }] : []),
    { chave: "departamento" as const, rotulo: "Por departamento" },
    { chave: "individual" as const, rotulo: "Individual" },
  ];

  const devsFiltrados =
    filtroDept === "todos" ? estatisticas.porDev : estatisticas.porDev.filter((d) => d.departamentos.includes(filtroDept));
  const maiorResolvidos = Math.max(...estatisticas.porDev.map((d) => d.resolvidosTotal), 1);

  const g = estatisticas.global;
  const taxaGlobalPct = g?.taxaReabertura != null ? Math.round(g.taxaReabertura * 100) : null;
  const corTaxaGlobal =
    taxaGlobalPct === null ? undefined : taxaGlobalPct <= 15 ? "text-success" : taxaGlobalPct <= 30 ? "text-warning" : "text-danger";

  return (
    <div className="mx-auto h-full max-w-5xl overflow-y-auto px-6 py-6">
      <h1 className="mb-1 text-lg font-semibold text-ink">Dashboard</h1>
      <p className="mb-5 text-sm text-ink-400">
        {papel === "admin"
          ? "Visão geral do funil de apoio — atualizado a cada visita a esta página."
          : "O teu funil de apoio — atualizado a cada visita a esta página."}
      </p>

      {estatisticas.insights.length > 0 && (
        <Cartao className="animate-entrada mb-5 border-accent/20 bg-accent-light/40 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent-hover">O que os números dizem</p>
          <ul className="space-y-1.5 text-sm text-ink">
            {estatisticas.insights.map((insight, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-accent" aria-hidden="true">
                  ›
                </span>
                {insight}
              </li>
            ))}
          </ul>
        </Cartao>
      )}

      <div className="mb-5 inline-flex gap-1 rounded-lg bg-surface-muted p-1">
        {abas.map((a) => (
          <button
            key={a.chave}
            type="button"
            onClick={() => setAba(a.chave)}
            className={clsx(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150",
              aba === a.chave ? "bg-surface-card text-ink shadow-sm" : "text-ink-400 hover:text-ink"
            )}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      {aba === "global" && g && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <CartaoEstatistica rotulo="Total de tickets" valor={g.estados.total} descricao="Desde sempre." atraso={0} />
            <CartaoEstatistica
              rotulo="Abertos"
              valor={g.estados.aberto}
              corTexto="text-warning"
              descricao="À espera de resposta."
              atraso={40}
            />
            <CartaoEstatistica
              rotulo="Em curso"
              valor={g.estados.emCurso}
              corTexto="text-accent-hover"
              descricao="Já assumidos por um dev."
              atraso={80}
            />
            <CartaoEstatistica
              rotulo="Resolvidos"
              valor={g.estados.resolvido}
              corTexto="text-success"
              descricao="Aguardam confirmação do cliente."
              atraso={120}
            />
            <CartaoEstatistica rotulo="Fechados" valor={g.estados.fechado} descricao="Ciclo terminado." atraso={160} />
            <CartaoEstatistica
              rotulo="Clientes ativos"
              valor={g.clientesAtivos}
              descricao="Contas de cliente registadas."
              atraso={200}
            />
            <CartaoEstatistica
              rotulo="Por atribuir"
              valor={g.porAtribuir}
              corTexto={g.porAtribuir > 0 ? "text-warning" : "text-ink"}
              descricao="Sem departamento definido ainda."
              atraso={240}
            />
            <CartaoEstatistica
              rotulo="Tempo médio de resolução"
              // formatarDuracao já escolhe a unidade certa (min/h/dias) — um
              // Math.round(ms / 3_600_000) fixo em horas mostrava sempre "0h"
              // para médias abaixo de 1h, mesmo a descrição por baixo já
              // mostrando os minutos corretamente.
              valor={g.tempoMedioResolucaoMs === null ? "—" : formatarDuracao(g.tempoMedioResolucaoMs)}
              descricao={g.tempoMedioResolucaoMs === null ? "Ainda sem ticket resolvido." : "em média"}
              atraso={280}
            />
            <CartaoEstatistica
              rotulo="Taxa de reabertura"
              valor={taxaGlobalPct ?? 0}
              sufixo="%"
              corTexto={corTaxaGlobal}
              descricao="Proxy de satisfação — ver nota técnica."
              atraso={320}
            />
          </div>
          <Cartao interativo className="animate-entrada mt-4 p-5" style={{ animationDelay: "360ms" }}>
            <p className="mb-3 text-sm font-medium text-ink">Distribuição de estados</p>
            <FaixaEstados estados={g.estados} atraso={360} />
          </Cartao>
        </>
      )}

      {aba === "departamento" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {estatisticas.porDepartamento.map((d, i) => {
            const classes = CLASSES_DEPARTAMENTO[d.departamento];
            const pct = d.taxaReabertura !== null ? Math.round(d.taxaReabertura * 100) : null;
            const selecionado = filtroDept === d.departamento;
            return (
              <Cartao
                key={d.departamento}
                interativo
                selecionado={selecionado}
                className="animate-entrada cursor-pointer p-5"
                style={{ animationDelay: `${i * 60}ms` }}
                onClick={() => setFiltroDept(selecionado ? "todos" : d.departamento)}
                role="button"
                tabIndex={0}
                aria-pressed={selecionado}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className={clsx("inline-flex items-center gap-2 text-sm font-semibold", classes.texto)}>
                    <span className={clsx("h-2.5 w-2.5 rounded-full", classes.ponto)} aria-hidden="true" />
                    {ROTULO_DEPARTAMENTO[d.departamento]}
                  </span>
                  <span className="text-xs text-ink-400">{d.estados.total} ticket(s)</span>
                </div>
                <FaixaEstados estados={d.estados} atraso={i * 60} />
                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className={clsx("text-lg font-semibold", d.porAtribuir > 0 ? "text-warning" : "text-ink")}>{d.porAtribuir}</p>
                    <p className="text-[11px] text-ink-400">Por atribuir</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-ink">
                      {d.tempoMedioResolucaoMs === null ? "—" : formatarDuracao(d.tempoMedioResolucaoMs)}
                    </p>
                    <p className="text-[11px] text-ink-400">Tempo médio</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-ink">{pct === null ? "—" : `${pct}%`}</p>
                    <p className="text-[11px] text-ink-400">Reabertura</p>
                  </div>
                </div>
              </Cartao>
            );
          })}
        </div>
      )}

      {aba === "individual" && (
        <>
          {estatisticas.porDepartamento.length > 1 && (
            <div className="mb-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => setFiltroDept("todos")} className={classePill(filtroDept === "todos")}>
                Todos
              </button>
              {estatisticas.porDepartamento.map((d) => (
                <button
                  key={d.departamento}
                  type="button"
                  onClick={() => setFiltroDept(d.departamento)}
                  className={classePill(filtroDept === d.departamento)}
                >
                  {ROTULO_DEPARTAMENTO[d.departamento]}
                </button>
              ))}
            </div>
          )}
          {devsFiltrados.length === 0 ? (
            <Cartao className="p-6 text-center text-sm text-ink-300">Sem dados para este filtro.</Cartao>
          ) : (
            <div className="space-y-3">
              {devsFiltrados.map((dev, i) => {
                const pct = dev.taxaReabertura !== null ? Math.round(dev.taxaReabertura * 100) : null;
                return (
                  <Cartao key={dev.idDev} interativo className="animate-entrada p-4" style={{ animationDelay: `${i * 60}ms` }}>
                    <div className="mb-2 flex items-baseline justify-between">
                      <span className="text-sm font-medium text-ink">{dev.nome}</span>
                      <span className="text-xs text-ink-400">{dev.resolvidosTotal} fechado(s)</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-surface-muted">
                      <div
                        className="barra-cresce h-full rounded-full bg-accent"
                        style={{ width: `${(dev.resolvidosTotal / maiorResolvidos) * 100}%`, animationDelay: `${i * 60}ms` }}
                      />
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-sm font-semibold text-ink">{dev.atribuidosAtivos}</p>
                        <p className="text-[11px] text-ink-400">Ativos agora</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-ink">
                          {dev.tempoMedioResolucaoMs === null ? "—" : formatarDuracao(dev.tempoMedioResolucaoMs)}
                        </p>
                        <p className="text-[11px] text-ink-400">Tempo médio</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-ink">{pct === null ? "—" : `${pct}%`}</p>
                        <p className="text-[11px] text-ink-400">Reabertura</p>
                      </div>
                    </div>
                  </Cartao>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
