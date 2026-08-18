"use client";

import { useState, type FormEvent } from "react";
import { Cartao } from "@/components/ui/Card";
import { Campo } from "@/components/ui/Input";
import { Botao } from "@/components/ui/Button";
import { Distintivo } from "@/components/ui/Badge";
import type { EntradaBaseConhecimento, TipoSite } from "@/core/types";

const TIPOS_SITE: { valor: TipoSite; rotulo: string }[] = [
  { valor: "institutional", rotulo: "Site institucional" },
  { valor: "ecommerce", rotulo: "Loja online" },
  { valor: "both", rotulo: "Ambos" },
];

export function GestorBaseConhecimento({ entradasIniciais }: { entradasIniciais: EntradaBaseConhecimento[] }) {
  const [entradas, setEntradas] = useState(entradasIniciais);
  const [formulario, setFormulario] = useState({
    titulo: "",
    conteudo: "",
    tipoSite: "both" as TipoSite,
    etiquetas: "",
  });
  const [aCarregar, setACarregar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function submeter(evento: FormEvent) {
    evento.preventDefault();
    setACarregar(true);
    setErro(null);

    const resposta = await fetch("/api/admin/knowledge-base", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: formulario.titulo,
        conteudo: formulario.conteudo,
        tipoSite: formulario.tipoSite,
        etiquetas: formulario.etiquetas
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        publicado: true,
      }),
    });
    const corpo = await resposta.json();
    setACarregar(false);

    if (!resposta.ok) {
      setErro(corpo.error ?? "Não foi possível criar a entrada.");
      return;
    }

    setEntradas((anteriores) => [corpo.entrada, ...anteriores]);
    setFormulario({ titulo: "", conteudo: "", tipoSite: "both", etiquetas: "" });
  }

  async function alternarPublicado(entrada: EntradaBaseConhecimento) {
    const resposta = await fetch(`/api/admin/knowledge-base/${entrada.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicado: !entrada.is_published }),
    });
    if (resposta.ok) {
      const corpo = await resposta.json();
      setEntradas((anteriores) => anteriores.map((e) => (e.id === entrada.id ? corpo.entrada : e)));
    }
  }

  return (
    <div className="mx-auto grid h-full max-w-5xl grid-cols-1 gap-6 overflow-y-auto px-6 py-6 lg:grid-cols-2">
      <div>
        <h1 className="mb-4 text-lg font-semibold text-ink">Nova entrada</h1>
        <Cartao className="p-5">
          <form onSubmit={submeter} className="space-y-3">
            <Campo
              required
              placeholder="Título"
              value={formulario.titulo}
              onChange={(e) => setFormulario({ ...formulario, titulo: e.target.value })}
            />
            <textarea
              required
              rows={6}
              placeholder="Conteúdo — o texto que será usado como resposta ao cliente"
              value={formulario.conteudo}
              onChange={(e) => setFormulario({ ...formulario, conteudo: e.target.value })}
              className="w-full rounded-lg border border-ink-100 px-3.5 py-2.5 text-sm transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <select
              value={formulario.tipoSite}
              onChange={(e) => setFormulario({ ...formulario, tipoSite: e.target.value as TipoSite })}
              className="w-full rounded-lg border border-ink-100 bg-white px-3.5 py-2.5 text-sm text-ink transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {TIPOS_SITE.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.rotulo}
                </option>
              ))}
            </select>
            <Campo
              placeholder="Etiquetas separadas por vírgula (ex: password, loja, faturas)"
              value={formulario.etiquetas}
              onChange={(e) => setFormulario({ ...formulario, etiquetas: e.target.value })}
            />

            {erro && <p className="text-sm text-danger">{erro}</p>}

            <Botao type="submit" isLoading={aCarregar} className="w-full">
              Adicionar à base de conhecimento
            </Botao>
          </form>
        </Cartao>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-ink">Entradas ({entradas.length})</h2>
        <div className="space-y-2">
          {entradas.map((entrada, i) => (
            <Cartao
              key={entrada.id}
              className="animate-entrada p-3"
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-ink">{entrada.title}</p>
                <Distintivo value={entrada.is_published ? "resolved" : "closed"} />
              </div>
              <p className="line-clamp-2 text-xs text-ink-400">{entrada.content}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] text-ink-300">{entrada.site_type}</span>
                <Botao variant="ghost" size="sm" onClick={() => alternarPublicado(entrada)}>
                  {entrada.is_published ? "Despublicar" : "Publicar"}
                </Botao>
              </div>
            </Cartao>
          ))}
        </div>
      </div>
    </div>
  );
}
