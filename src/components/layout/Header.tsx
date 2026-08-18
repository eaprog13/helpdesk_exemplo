"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { criarClienteSupabase } from "@/lib/supabase/client";
import { Botao } from "@/components/ui/Button";

interface PropriedadesCabecalho {
  nomeCompleto: string;
  nomeEmpresa: string | null;
  /** Logótipo próprio do cliente (empresa), se tiver sido carregado pelo admin. Sem isto, mostra o "V" da Vértice. */
  logoUrl?: string | null;
  /**
   * Mostra as ligações entre "Falar connosco", "Os meus pedidos" e
   * "Histórico" — sempre as duas secções onde NÃO se está, para nunca ficar
   * sem forma de voltar a alguma (só faz sentido na área do cliente).
   */
  mostrarNavegacaoCliente?: boolean;
}

const SECCOES_CLIENTE = [
  { href: "/chat", prefixo: "/chat", rotulo: "Falar connosco" },
  { href: "/tickets", prefixo: "/tickets", rotulo: "Os meus pedidos" },
  { href: "/historico", prefixo: "/historico", rotulo: "Histórico" },
];

export function Cabecalho({ nomeCompleto, nomeEmpresa, logoUrl, mostrarNavegacaoCliente }: PropriedadesCabecalho) {
  const router = useRouter();
  const caminhoAtual = usePathname();

  const ligacoesSecundarias = mostrarNavegacaoCliente
    ? SECCOES_CLIENTE.filter((seccao) => !caminhoAtual?.startsWith(seccao.prefixo))
    : [];

  async function terminarSessao() {
    const supabase = criarClienteSupabase();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between border-b border-ink-100 bg-surface-card px-6 py-3">
      <div className="flex items-center gap-3">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL dinâmico (Supabase Storage), fora do domínio conhecido em build-time
          <img
            src={logoUrl}
            alt={nomeEmpresa ?? "Logótipo do cliente"}
            className="h-8 w-8 rounded-lg object-contain bg-white border border-ink-100"
          />
        ) : (
          <img src="/icon.png" alt="Vértice Digital" className="h-8 w-8 rounded-lg" />
        )}
        <div>
          <p className="text-sm font-semibold leading-tight text-ink">{nomeCompleto}</p>
          {nomeEmpresa && <p className="text-xs leading-tight text-ink-300">{nomeEmpresa}</p>}
        </div>
      </div>
      <div className="flex items-center gap-4">
        {ligacoesSecundarias.map((ligacao) => (
          <Link
            key={ligacao.href}
            href={ligacao.href}
            className="text-xs text-ink-400 transition-colors duration-150 hover:text-ink hover:underline"
          >
            {ligacao.rotulo}
          </Link>
        ))}
        <Botao variant="ghost" size="sm" onClick={terminarSessao}>
          Terminar sessão
        </Botao>
      </div>
    </header>
  );
}
