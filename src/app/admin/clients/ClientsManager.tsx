"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Cartao } from "@/components/ui/Card";
import { Campo } from "@/components/ui/Input";
import { Botao } from "@/components/ui/Button";
import { Distintivo } from "@/components/ui/Badge";
import type { Departamento, Perfil, TipoSite } from "@/core/types";

// Serviço(s) que o cliente TEM contratado com a Vértice — mostrado como
// "Serviço" no cartão abaixo. Um cliente pode ter mais do que um (ex.: site
// institucional E loja online), por isso é sempre multi-seleção, nunca um
// valor único "Ambos" (ver TipoSite em core/types.ts).
const TIPOS_SITE: { valor: TipoSite; rotulo: string }[] = [
  { valor: "institutional", rotulo: "Site Institucional" },
  { valor: "ecommerce", rotulo: "Loja Online" },
  { valor: "web_app", rotulo: "Aplicação Web" },
  { valor: "mobile_app", rotulo: "Mobile App" },
  { valor: "other", rotulo: "Outros" },
];

// Organização interna do admin (ex.: "que equipa acompanha este cliente
// por dentro") — NÃO é o serviço que o cliente tem contratado (isso é
// site_type, mostrado como "Serviço" no cartão abaixo). Nunca usada na
// atribuição de tickets (ver Departamento em core/types.ts).
const DEPARTAMENTOS_CLIENTE: { valor: Departamento; rotulo: string }[] = [
  { valor: "desenvolvimento", rotulo: "Desenvolvimento" },
  { valor: "marketing", rotulo: "Marketing Digital" },
  { valor: "design", rotulo: "Branding/Design" },
  { valor: "geral", rotulo: "Geral" },
];

function alternarNaLista<T>(lista: T[], valor: T): T[] {
  return lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor];
}

export function GestorClientes({ clientesIniciais }: { clientesIniciais: Perfil[] }) {
  const [clientes, setClientes] = useState(clientesIniciais);
  const [formulario, setFormulario] = useState({
    email: "",
    nomeCompleto: "",
    nomeEmpresa: "",
    telefone: "",
    tiposSite: ["institutional"] as TipoSite[],
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

    const resposta = await fetch("/api/admin/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formulario),
    });
    const corpo = await resposta.json();
    setACarregar(false);

    if (!resposta.ok) {
      setErro(corpo.error ?? "Não foi possível criar o cliente.");
      return;
    }

    setSucesso(`Conta criada para ${formulario.email}. As credenciais foram enviadas por email.`);
    setFormulario({
      email: "",
      nomeCompleto: "",
      nomeEmpresa: "",
      telefone: "",
      tiposSite: ["institutional"],
      departamentos: [],
    });

    const respostaLista = await fetch("/api/admin/clients");
    if (respostaLista.ok) {
      const corpoLista = await respostaLista.json();
      setClientes(corpoLista.clientes);
    }
  }

  return (
    <div className="mx-auto grid h-full max-w-5xl grid-cols-1 gap-6 overflow-y-auto px-6 py-6 lg:grid-cols-2">
      <div>
        <h1 className="mb-4 text-lg font-semibold text-ink">Criar cliente</h1>
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
            <Campo
              required
              placeholder="Empresa"
              value={formulario.nomeEmpresa}
              onChange={(e) => setFormulario({ ...formulario, nomeEmpresa: e.target.value })}
            />
            <Campo
              placeholder="Telefone (+351912345678, opcional — para WhatsApp)"
              value={formulario.telefone}
              onChange={(e) => setFormulario({ ...formulario, telefone: e.target.value })}
            />

            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-ink">Serviço(s)</legend>
              <div className="flex flex-wrap gap-3">
                {TIPOS_SITE.map((t) => (
                  <label key={t.valor} className="flex items-center gap-1.5 text-sm text-ink-400">
                    <input
                      type="checkbox"
                      checked={formulario.tiposSite.includes(t.valor)}
                      onChange={() =>
                        setFormulario({ ...formulario, tiposSite: alternarNaLista(formulario.tiposSite, t.valor) })
                      }
                    />
                    {t.rotulo}
                  </label>
                ))}
              </div>
              {formulario.tiposSite.length === 0 && (
                <p className="mt-1 text-xs text-danger">Escolha pelo menos um serviço.</p>
              )}
            </fieldset>

            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-ink">
                Departamento <span className="font-normal text-ink-300">(organização interna, opcional)</span>
              </legend>
              <div className="flex flex-wrap gap-3">
                {DEPARTAMENTOS_CLIENTE.map((d) => (
                  <label key={d.valor} className="flex items-center gap-1.5 text-sm text-ink-400">
                    <input
                      type="checkbox"
                      checked={formulario.departamentos.includes(d.valor)}
                      onChange={() =>
                        setFormulario({ ...formulario, departamentos: alternarNaLista(formulario.departamentos, d.valor) })
                      }
                    />
                    {d.rotulo}
                  </label>
                ))}
              </div>
            </fieldset>

            {erro && <p className="text-sm text-danger">{erro}</p>}
            {sucesso && <p className="text-sm text-success">{sucesso}</p>}

            <Botao type="submit" isLoading={aCarregar} disabled={formulario.tiposSite.length === 0} className="w-full">
              Criar conta e enviar credenciais
            </Botao>
          </form>
        </Cartao>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-ink">Clientes ({clientes.length})</h2>
        <div className="space-y-2">
          {clientes.map((c, i) => (
            <CartaoCliente
              key={c.id}
              cliente={c}
              atraso={Math.min(i, 8) * 40}
              aoAtualizarLogo={(logoUrl) =>
                setClientes((anteriores) => anteriores.map((x) => (x.id === c.id ? { ...x, logo_url: logoUrl } : x)))
              }
              aoAtualizarDepartamentos={(departamentos) =>
                setClientes((anteriores) => anteriores.map((x) => (x.id === c.id ? { ...x, department: departamentos } : x)))
              }
              aoAtualizarServicos={(tiposSite) =>
                setClientes((anteriores) => anteriores.map((x) => (x.id === c.id ? { ...x, site_type: tiposSite } : x)))
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function CartaoCliente({
  cliente,
  atraso,
  aoAtualizarLogo,
  aoAtualizarDepartamentos,
  aoAtualizarServicos,
}: {
  cliente: Perfil;
  atraso: number;
  aoAtualizarLogo: (logoUrl: string) => void;
  aoAtualizarDepartamentos: (departamentos: Departamento[]) => void;
  aoAtualizarServicos: (tiposSite: TipoSite[]) => void;
}) {
  const inputFicheiroRef = useRef<HTMLInputElement>(null);
  const [aCarregarLogo, setACarregarLogo] = useState(false);
  const [erroLogo, setErroLogo] = useState<string | null>(null);

  const [aEditarDepartamentos, setAEditarDepartamentos] = useState(false);
  const [departamentosEditados, setDepartamentosEditados] = useState<Departamento[]>(cliente.department);
  const [aGuardarDepartamentos, setAGuardarDepartamentos] = useState(false);
  const [erroDepartamentos, setErroDepartamentos] = useState<string | null>(null);

  const [aEditarServicos, setAEditarServicos] = useState(false);
  const [servicosEditados, setServicosEditados] = useState<TipoSite[]>(cliente.site_type);
  const [aGuardarServicos, setAGuardarServicos] = useState(false);
  const [erroServicos, setErroServicos] = useState<string | null>(null);

  function abrirEdicaoDepartamentos() {
    setDepartamentosEditados(cliente.department);
    setErroDepartamentos(null);
    setAEditarDepartamentos(true);
  }

  async function guardarDepartamentos() {
    setAGuardarDepartamentos(true);
    setErroDepartamentos(null);

    const resposta = await fetch(`/api/admin/clients/${cliente.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ departamentos: departamentosEditados }),
    });
    const corpo = await resposta.json();
    setAGuardarDepartamentos(false);

    if (!resposta.ok) {
      setErroDepartamentos(corpo.error ?? "Não foi possível guardar as alterações.");
      return;
    }

    aoAtualizarDepartamentos(departamentosEditados);
    setAEditarDepartamentos(false);
  }

  function abrirEdicaoServicos() {
    setServicosEditados(cliente.site_type);
    setErroServicos(null);
    setAEditarServicos(true);
  }

  async function guardarServicos() {
    if (servicosEditados.length === 0) {
      setErroServicos("Escolha pelo menos um serviço.");
      return;
    }
    setAGuardarServicos(true);
    setErroServicos(null);

    const resposta = await fetch(`/api/admin/clients/${cliente.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tiposSite: servicosEditados }),
    });
    const corpo = await resposta.json();
    setAGuardarServicos(false);

    if (!resposta.ok) {
      setErroServicos(corpo.error ?? "Não foi possível guardar as alterações.");
      return;
    }

    aoAtualizarServicos(servicosEditados);
    setAEditarServicos(false);
  }

  async function aoEscolherFicheiro(evento: React.ChangeEvent<HTMLInputElement>) {
    const ficheiro = evento.target.files?.[0];
    if (!ficheiro) return;

    setACarregarLogo(true);
    setErroLogo(null);

    const dados = new FormData();
    dados.append("ficheiro", ficheiro);

    const resposta = await fetch(`/api/admin/clients/${cliente.id}/logo`, { method: "POST", body: dados });
    const corpo = await resposta.json();
    setACarregarLogo(false);
    evento.target.value = ""; // permite voltar a escolher o mesmo ficheiro, se necessário

    if (!resposta.ok) {
      setErroLogo(corpo.error ?? "Não foi possível carregar o logótipo.");
      return;
    }
    aoAtualizarLogo(corpo.logoUrl);
  }

  return (
    <Cartao className="animate-entrada p-3" style={{ animationDelay: `${atraso}ms` }}>
      <div className="flex items-center gap-3">
        {cliente.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL dinâmico do Supabase Storage
          <img
            src={cliente.logo_url}
            alt={cliente.company_name ?? "Logótipo"}
            className="h-10 w-10 shrink-0 rounded-lg border border-ink-100 bg-white object-contain"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink-50 text-xs text-ink-300">
            sem logo
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{cliente.full_name}</p>
          <p className="truncate text-xs text-ink-400">{cliente.company_name}</p>

          {/* Serviço = o(s) que o cliente TEM contratado com a Vértice (site
              institucional, loja online, aplicação web…) — vem de
              site_type, nunca fica vazio. Pode ter mais do que um, todos
              aparecem lado a lado. Não confundir com "Departamento"
              abaixo, que é só organização interna do admin. */}
          {!aEditarServicos && (
            <div className="mt-1 flex flex-wrap items-center gap-1">
              <span className="text-xs text-ink-300">Serviço:</span>
              {cliente.site_type.map((t) => (
                <Distintivo key={t} value={t} />
              ))}
              <button
                type="button"
                onClick={abrirEdicaoServicos}
                className="text-xs text-accent-hover underline-offset-2 hover:underline"
              >
                Editar
              </button>
            </div>
          )}

          {!aEditarDepartamentos && (
            <div className="mt-1 flex flex-wrap items-center gap-1">
              <span className="text-xs text-ink-300">Departamento (interno):</span>
              {cliente.department.length > 0 ? (
                cliente.department.map((d) => <Distintivo key={d} value={d} />)
              ) : (
                <span className="text-xs text-ink-300">nenhum</span>
              )}
              <button
                type="button"
                onClick={abrirEdicaoDepartamentos}
                className="text-xs text-accent-hover underline-offset-2 hover:underline"
              >
                Editar
              </button>
            </div>
          )}
          {cliente.must_change_password && (
            <p className="mt-1 text-[11px] text-warning">Aguarda 1º acesso</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link href={`/admin/clients/${cliente.id}/history`}>
            <Botao type="button" variant="ghost" size="sm">
              Ver histórico
            </Botao>
          </Link>
          <input
            ref={inputFicheiroRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="hidden"
            onChange={aoEscolherFicheiro}
          />
          <Botao
            type="button"
            variant="secondary"
            size="sm"
            isLoading={aCarregarLogo}
            onClick={() => inputFicheiroRef.current?.click()}
          >
            {cliente.logo_url ? "Trocar logo" : "Carregar logo"}
          </Botao>
        </div>
      </div>
      {erroLogo && <p className="mt-2 text-xs text-danger">{erroLogo}</p>}

      {aEditarServicos && (
        <div className="mt-3 space-y-2 border-t border-ink-100 pt-3">
          <p className="text-xs font-medium text-ink-400">Serviço(s)</p>
          <div className="flex flex-wrap gap-3">
            {TIPOS_SITE.map((t) => (
              <label key={t.valor} className="flex items-center gap-1.5 text-sm text-ink-400">
                <input
                  type="checkbox"
                  checked={servicosEditados.includes(t.valor)}
                  onChange={() => setServicosEditados(alternarNaLista(servicosEditados, t.valor))}
                />
                {t.rotulo}
              </label>
            ))}
          </div>
          {erroServicos && <p className="text-xs text-danger">{erroServicos}</p>}
          <div className="flex gap-2">
            <Botao type="button" size="sm" isLoading={aGuardarServicos} onClick={guardarServicos}>
              Guardar
            </Botao>
            <Botao
              type="button"
              variant="ghost"
              size="sm"
              disabled={aGuardarServicos}
              onClick={() => setAEditarServicos(false)}
            >
              Cancelar
            </Botao>
          </div>
        </div>
      )}

      {aEditarDepartamentos && (
        <div className="mt-3 space-y-2 border-t border-ink-100 pt-3">
          <p className="text-xs font-medium text-ink-400">Departamento (organização interna, opcional)</p>
          <div className="flex flex-wrap gap-3">
            {DEPARTAMENTOS_CLIENTE.map((d) => (
              <label key={d.valor} className="flex items-center gap-1.5 text-sm text-ink-400">
                <input
                  type="checkbox"
                  checked={departamentosEditados.includes(d.valor)}
                  onChange={() => setDepartamentosEditados(alternarNaLista(departamentosEditados, d.valor))}
                />
                {d.rotulo}
              </label>
            ))}
          </div>
          {erroDepartamentos && <p className="text-xs text-danger">{erroDepartamentos}</p>}
          <div className="flex gap-2">
            <Botao type="button" size="sm" isLoading={aGuardarDepartamentos} onClick={guardarDepartamentos}>
              Guardar
            </Botao>
            <Botao
              type="button"
              variant="ghost"
              size="sm"
              disabled={aGuardarDepartamentos}
              onClick={() => setAEditarDepartamentos(false)}
            >
              Cancelar
            </Botao>
          </div>
        </div>
      )}
    </Cartao>
  );
}
