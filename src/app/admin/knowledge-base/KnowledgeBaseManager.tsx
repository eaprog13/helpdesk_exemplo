"use client";

import { useState, type FormEvent } from "react";
import { Cartao } from "@/components/ui/Card";
import { Campo } from "@/components/ui/Input";
import { Botao } from "@/components/ui/Button";
import { Distintivo } from "@/components/ui/Badge";
import { CaixaSelecao, GrupoCaixasSelecao } from "@/components/ui/Checkbox";
import type { EntradaBaseConhecimento, TipoSite, Departamento } from "@/core/types";

// [] (nenhum selecionado) = artigo genérico, aplica-se a todos os tipos —
// ver TipoSite em core/types.ts. "Ambos" já não existe como valor: um
// artigo pode aplicar-se a vários tipos em concreto, ou a nenhum (= todos).
const TIPOS_SITE: { valor: TipoSite; rotulo: string }[] = [
  { valor: "institutional", rotulo: "Site Institucional" },
  { valor: "ecommerce", rotulo: "Loja Online" },
  { valor: "web_app", rotulo: "Aplicação Web" },
  { valor: "mobile_app", rotulo: "Mobile App" },
  { valor: "other", rotulo: "Outros" },
];

function alternarNaLista<T>(lista: T[], valor: T): T[] {
  return lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor];
}

// "" = por classificar — ver core/types.ts (Departamento) e a nota em
// core/services/chatService.ts sobre porque isto ainda não decide sozinho
// o departamento de um ticket, mesmo já existindo aqui.
const DEPARTAMENTOS: { valor: Departamento | ""; rotulo: string }[] = [
  { valor: "", rotulo: "Por classificar" },
  { valor: "desenvolvimento", rotulo: "Desenvolvimento" },
  { valor: "marketing", rotulo: "Marketing Digital" },
  { valor: "design", rotulo: "Branding/Design" },
  { valor: "geral", rotulo: "Geral" },
];

export function GestorBaseConhecimento({
  entradasIniciais,
  papel,
}: {
  entradasIniciais: EntradaBaseConhecimento[];
  /** Um dev nunca publica de imediato — a rota já reforça isto, isto é só para a UI não prometer o que não cumpre. */
  papel: "admin" | "dev";
}) {
  const souAdmin = papel === "admin";
  const [entradas, setEntradas] = useState(entradasIniciais);
  const [formulario, setFormulario] = useState({
    titulo: "",
    conteudo: "",
    tipoSite: [] as TipoSite[],
    etiquetas: "",
    departamento: "" as Departamento | "",
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
        // Um dev cria sempre como rascunho — a rota força isto de qualquer
        // forma, mas mandar já o valor certo evita um "porquê é que ficou
        // por publicar se eu disse que sim" confuso.
        publicado: souAdmin,
        departamento: formulario.departamento || null,
      }),
    });
    const corpo = await resposta.json();
    setACarregar(false);

    if (!resposta.ok) {
      setErro(corpo.error ?? "Não foi possível criar a entrada.");
      return;
    }

    setEntradas((anteriores) => [corpo.entrada, ...anteriores]);
    setFormulario({ titulo: "", conteudo: "", tipoSite: [], etiquetas: "", departamento: "" });
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

            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-ink">
                Tipo(s) de site <span className="font-normal text-ink-300">(nenhum = genérico, aplica-se a todos)</span>
              </legend>
              <GrupoCaixasSelecao>
                {TIPOS_SITE.map((t) => (
                  <CaixaSelecao
                    key={t.valor}
                    rotulo={t.rotulo}
                    checked={formulario.tipoSite.includes(t.valor)}
                    onChange={() =>
                      setFormulario({ ...formulario, tipoSite: alternarNaLista(formulario.tipoSite, t.valor) })
                    }
                  />
                ))}
              </GrupoCaixasSelecao>
            </fieldset>

            <Campo
              placeholder="Etiquetas separadas por vírgula (ex: password, loja, faturas)"
              value={formulario.etiquetas}
              onChange={(e) => setFormulario({ ...formulario, etiquetas: e.target.value })}
            />
            <select
              value={formulario.departamento}
              onChange={(e) => setFormulario({ ...formulario, departamento: e.target.value as Departamento | "" })}
              className="w-full rounded-lg border border-ink-100 bg-white px-3.5 py-2.5 text-sm text-ink transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {DEPARTAMENTOS.map((d) => (
                <option key={d.rotulo} value={d.valor}>
                  {d.rotulo}
                </option>
              ))}
            </select>

            {!souAdmin && (
              <p className="text-xs text-ink-300">
                Entra como rascunho — só um admin pode publicar (ver &quot;Entradas&quot; ao lado).
              </p>
            )}
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
              interativo
              className="animate-entrada p-3"
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-ink">{entrada.title}</p>
                <Distintivo value={entrada.is_published ? "resolved" : "closed"} />
              </div>
              <p className="line-clamp-2 text-xs text-ink-400">{entrada.content}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="flex flex-wrap items-center gap-1 text-[11px] text-ink-300">
                  {entrada.site_type.length > 0 ? (
                    entrada.site_type.map((t) => <Distintivo key={t} value={t} />)
                  ) : (
                    <span>Genérico</span>
                  )}
                  <span>· {DEPARTAMENTOS.find((d) => d.valor === (entrada.department ?? ""))?.rotulo}</span>
                </span>
                {/* Despublicar (retirar do ar) continua aberto a qualquer
                    staff; publicar (pôr no ar) é só admin — ver nota em
                    api/admin/knowledge-base/[id]/route.ts. */}
                {(entrada.is_published || souAdmin) && (
                  <Botao variant="ghost" size="sm" onClick={() => alternarPublicado(entrada)}>
                    {entrada.is_published ? "Despublicar" : "Publicar"}
                  </Botao>
                )}
                {!entrada.is_published && !souAdmin && (
                  <span className="text-[11px] text-ink-300">Aguarda revisão de um admin</span>
                )}
              </div>
            </Cartao>
          ))}
        </div>
      </div>
    </div>
  );
}
