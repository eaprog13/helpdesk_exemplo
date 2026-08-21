"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import { criarClienteSupabase } from "@/lib/supabase/client";
import { Botao } from "@/components/ui/Button";
import { BotaoAbrirTicket } from "@/components/ticket/OpenTicketButton";

interface PropriedadesCabecalho {
  nomeCompleto: string;
  nomeEmpresa: string | null;
  /** Logótipo próprio do cliente (empresa), se tiver sido carregado pelo admin. Sem isto, mostra o "V" da Vértice Digital. */
  logoUrl?: string | null;
  /**
   * Mostra as abas "Falar connosco", "Os meus pedidos" e "Histórico" —
   * sempre as 3, com a atual destacada, para o cliente nunca perder a
   * noção de onde está (só faz sentido na área do cliente).
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

  async function terminarSessao() {
    const supabase = criarClienteSupabase();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between gap-4 border-b border-ink-100 bg-surface-card px-6 py-3">
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

      {mostrarNavegacaoCliente && (
        <nav className="flex items-center gap-1">
          {SECCOES_CLIENTE.map((seccao) => {
            const ativo = caminhoAtual === seccao.prefixo || caminhoAtual?.startsWith(`${seccao.prefixo}/`);
            return (
              <Link
                key={seccao.href}
                href={seccao.href}
                aria-current={ativo ? "page" : undefined}
                className={clsx(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-150",
                  ativo ? "bg-accent-light text-accent-hover" : "text-ink-400 hover:bg-surface-muted hover:text-ink"
                )}
              >
                {seccao.rotulo}
              </Link>
            );
          })}
        </nav>
      )}

      <div className="flex items-center gap-2">
        {mostrarNavegacaoCliente && <BotaoAbrirTicket />}
        {/* Mesma página em /change-password serve o 1º acesso obrigatório
            e esta alteração voluntária — ver comentário lá. Visível para
            os 3 papéis (cliente, dev, admin): todos autenticam da mesma
            forma, todos precisam de poder trocar a password sem depender
            de um admin. */}
        <Link href="/change-password">
          <Botao variant="ghost" size="sm" type="button">
            Alterar password
          </Botao>
        </Link>
        <Botao variant="ghost" size="sm" onClick={terminarSessao}>
          Terminar sessão
        </Botao>
      </div>
    </header>
  );
}
