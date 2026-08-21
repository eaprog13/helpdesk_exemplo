"use client";

import { useState, type FormEvent } from "react";
import { Cartao } from "@/components/ui/Card";
import { Campo } from "@/components/ui/Input";
import { Botao } from "@/components/ui/Button";
import { Distintivo } from "@/components/ui/Badge";
import { CaixaSelecao, GrupoCaixasSelecao } from "@/components/ui/Checkbox";
import type { Departamento, Perfil } from "@/core/types";

// Mesma lista/ordem usada em ClientsManager.tsx e OpenTicketButton.tsx —
// aqui decide elegibilidade na atribuição automática de tickets (ver
// Departamento em core/types.ts), não é só etiqueta organizacional.
const DEPARTAMENTOS_EQUIPA: { valor: Departamento; rotulo: string }[] = [
  { valor: "desenvolvimento", rotulo: "Desenvolvimento" },
  { valor: "marketing", rotulo: "Marketing Digital" },
  { valor: "design", rotulo: "Branding/Design" },
  { valor: "geral", rotulo: "Geral" },
];

const PAPEIS_EQUIPA: { valor: "dev" | "admin"; rotulo: string }[] = [
  { valor: "dev", rotulo: "Dev — resolve tickets do(s) seu(s) departamento(s)" },
  { valor: "admin", rotulo: "Admin — gere clientes, equipa e todos os tickets" },
];

function alternarNaLista<T>(lista: T[], valor: T): T[] {
  return lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor];
}

export function GestorEquipa({ equipaInicial }: { equipaInicial: Perfil[] }) {
  const [equipa, setEquipa] = useState(equipaInicial);
  const [formulario, setFormulario] = useState({
    email: "",
    nomeCompleto: "",
    role: "dev" as "dev" | "admin",
    departamentos: [] as Departamento[],
  });
  const [aCarregar, setACarregar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  async function submeter(evento: FormEvent) {
    evento.preventDefault();
    setACarregar(true);
    setErro(null);
    setSucesso(null);

    const resposta = await fetch("/api/admin/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formulario),
    });
    const corpo = await resposta.json();
    setACarregar(false);

    if (!resposta.ok) {
      setErro(corpo.error ?? "Não foi possível criar a conta.");
      return;
    }

    setSucesso(`Conta criada para ${formulario.email}. As credenciais foram enviadas por email.`);
    setFormulario({ email: "", nomeCompleto: "", role: "dev", departamentos: [] });

    const respostaLista = await fetch("/api/admin/team");
    if (respostaLista.ok) {
      const corpoLista = await respostaLista.json();
      setEquipa(corpoLista.equipa);
    }
  }

  return (
    <div className="mx-auto grid h-full max-w-5xl grid-cols-1 gap-6 overflow-y-auto px-6 py-6 lg:grid-cols-2">
      <div>
        <h1 className="mb-4 text-lg font-semibold text-ink">Criar conta de equipa</h1>
        <Cartao className="p-5">
          <form onSubmit={submeter} className="space-y-3">
            <Campo
              type="email"
              required
              placeholder="Email"
              value={formulario.email}
              onChange={(e) => setFormulario({ ...formulario, email: e.target.value })}
            />
            <Campo
              required
              placeholder="Nome completo"
              value={formulario.nomeCompleto}
              onChange={(e) => setFormulario({ ...formulario, nomeCompleto: e.target.value })}
            />
            <select
              value={formulario.role}
              onChange={(e) => setFormulario({ ...formulario, role: e.target.value as "dev" | "admin" })}
              className="w-full rounded-lg border border-ink-100 bg-white px-3.5 py-2.5 text-sm text-ink transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {PAPEIS_EQUIPA.map((p) => (
                <option key={p.valor} value={p.valor}>
                  {p.rotulo}
                </option>
              ))}
            </select>

            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-ink">
                Departamento(s){" "}
                <span className="font-normal text-ink-300">
                  (decide que tickets recebe automaticamente — ver "Fila do departamento")
                </span>
              </legend>
              <GrupoCaixasSelecao>
                {DEPARTAMENTOS_EQUIPA.map((d) => (
                  <CaixaSelecao
                    key={d.valor}
                    rotulo={d.rotulo}
                    checked={formulario.departamentos.includes(d.valor)}
                    onChange={() =>
                      setFormulario({ ...formulario, departamentos: alternarNaLista(formulario.departamentos, d.valor) })
                    }
                  />
                ))}
              </GrupoCaixasSelecao>
            </fieldset>

            {erro && <p className="text-sm text-danger">{erro}</p>}
            {sucesso && <p className="text-sm text-success">{sucesso}</p>}

            <Botao type="submit" isLoading={aCarregar} className="w-full">
              Criar conta e enviar credenciais
            </Botao>
          </form>
        </Cartao>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-ink">Equipa ({equipa.length})</h2>
        <div className="space-y-2">
          {equipa.map((membro, i) => (
            <CartaoMembro
              key={membro.id}
              membro={membro}
              atraso={Math.min(i, 8) * 40}
              aoAtualizar={(atualizado) =>
                setEquipa((anteriores) => anteriores.map((m) => (m.id === atualizado.id ? atualizado : m)))
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function CartaoMembro({
  membro,
  atraso,
  aoAtualizar,
}: {
  membro: Perfil;
  atraso: number;
  aoAtualizar: (membro: Perfil) => void;
}) {
  const [aEditar, setAEditar] = useState(false);
  const [role, setRole] = useState<"dev" | "admin">(membro.role === "admin" ? "admin" : "dev");
  const [departamentos, setDepartamentos] = useState<Departamento[]>(membro.department);
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function abrirEdicao() {
    setRole(membro.role === "admin" ? "admin" : "dev");
    setDepartamentos(membro.department);
    setErro(null);
    setAEditar(true);
  }

  async function guardar() {
    setAGuardar(true);
    setErro(null);

    const resposta = await fetch(`/api/admin/team/${membro.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, departamentos }),
    });
    const corpo = await resposta.json();
    setAGuardar(false);

    if (!resposta.ok) {
      setErro(corpo.error ?? "Não foi possível guardar as alterações.");
      return;
    }

    aoAtualizar(corpo.membro);
    setAEditar(false);
  }

  return (
    <Cartao interativo selecionado={aEditar} className="animate-entrada p-3" style={{ animationDelay: `${atraso}ms` }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink">{membro.full_name}</p>
          <p className="text-xs text-ink-300">{membro.role === "admin" ? "Admin" : "Dev"}</p>
        </div>
        {!aEditar && (
          <div className="flex items-center gap-2">
            <div className="flex flex-wrap justify-end gap-1">
              {membro.department.length > 0 ? (
                membro.department.map((d) => <Distintivo key={d} value={d} />)
              ) : (
                <span className="text-xs text-ink-300">Sem departamento</span>
              )}
            </div>
            {/* Hover igual ao botão "Criar conta e enviar credenciais" (variant
                primary, sem overrides) — bg-ink-700 + texto branco — em vez do
                hover claro por omissão do variant secondary. */}
            <Botao
              variant="secondary"
              size="sm"
              onClick={abrirEdicao}
              className="hover:!border-ink-700 hover:!bg-ink-700 hover:!text-white"
            >
              Editar
            </Botao>
          </div>
        )}
      </div>

      {aEditar && (
        <div className="mt-3 space-y-3 border-t border-ink-100 pt-3">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "dev" | "admin")}
            className="w-full rounded-lg border border-ink-100 bg-white px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {PAPEIS_EQUIPA.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.rotulo}
              </option>
            ))}
          </select>

          <GrupoCaixasSelecao>
            {DEPARTAMENTOS_EQUIPA.map((d) => (
              <CaixaSelecao
                key={d.valor}
                rotulo={d.rotulo}
                checked={departamentos.includes(d.valor)}
                onChange={() => setDepartamentos(alternarNaLista(departamentos, d.valor))}
              />
            ))}
          </GrupoCaixasSelecao>

          {erro && <p className="text-sm text-danger">{erro}</p>}

          <div className="flex gap-2">
            <Botao size="sm" isLoading={aGuardar} onClick={guardar}>
              Guardar
            </Botao>
            <Botao variant="ghost" size="sm" onClick={() => setAEditar(false)} disabled={aGuardar}>
              Cancelar
            </Botao>
          </div>
        </div>
      )}
    </Cartao>
  );
}
