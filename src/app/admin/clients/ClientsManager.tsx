"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Cartao } from "@/components/ui/Card";
import { Campo } from "@/components/ui/Input";
import { Botao } from "@/components/ui/Button";
import type { Perfil, TipoSite } from "@/core/types";

const TIPOS_SITE: { valor: TipoSite; rotulo: string }[] = [
  { valor: "institutional", rotulo: "Site institucional" },
  { valor: "ecommerce", rotulo: "Loja online" },
  { valor: "both", rotulo: "Ambos" },
];

export function GestorClientes({ clientesIniciais }: { clientesIniciais: Perfil[] }) {
  const [clientes, setClientes] = useState(clientesIniciais);
  const [formulario, setFormulario] = useState({
    email: "",
    nomeCompleto: "",
    nomeEmpresa: "",
    telefone: "",
    tipoSite: "institutional" as TipoSite,
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
    setFormulario({ email: "", nomeCompleto: "", nomeEmpresa: "", telefone: "", tipoSite: "institutional" });

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

            {erro && <p className="text-sm text-danger">{erro}</p>}
            {sucesso && <p className="text-sm text-success">{sucesso}</p>}

            <Botao type="submit" isLoading={aCarregar} className="w-full">
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
}: {
  cliente: Perfil;
  atraso: number;
  aoAtualizarLogo: (logoUrl: string) => void;
}) {
  const inputFicheiroRef = useRef<HTMLInputElement>(null);
  const [aCarregarLogo, setACarregarLogo] = useState(false);
  const [erroLogo, setErroLogo] = useState<string | null>(null);

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
    </Cartao>
  );
}
