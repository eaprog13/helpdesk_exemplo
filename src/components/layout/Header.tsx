"use client";

import { useState, type SVGProps } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import { criarClienteSupabase } from "@/lib/supabase/client";
import { Botao } from "@/components/ui/Button";
import { BotaoAbrirTicket } from "@/components/ticket/OpenTicketButton";

// SVG inline (não uma lib de ícones) — mesma escolha e o mesmo traço de
// QuickActionCards.tsx: sem dependência nova só para 2 ícones.
function IconeMenu(p: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" {...p}>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}

function IconeFechar(p: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" {...p}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

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
  /**
   * Presente só na área admin/dev: mostra um botão hamburguer que abre a
   * sidebar (ver Sidebar.tsx) em vez de qualquer menu próprio — a área
   * admin não tem abas aqui, a navegação toda vive na sidebar.
   */
  aoAlternarMenuLateral?: () => void;
}

const SECCOES_CLIENTE = [
  { href: "/chat", prefixo: "/chat", rotulo: "Falar connosco" },
  { href: "/tickets", prefixo: "/tickets", rotulo: "Os meus pedidos" },
  { href: "/historico", prefixo: "/historico", rotulo: "Histórico" },
];

export function Cabecalho({
  nomeCompleto,
  nomeEmpresa,
  logoUrl,
  mostrarNavegacaoCliente,
  aoAlternarMenuLateral,
}: PropriedadesCabecalho) {
  const router = useRouter();
  const caminhoAtual = usePathname();
  // Menu próprio da área do cliente (abas + "Abrir ticket" + password +
  // sair) — a área admin não usa isto, tem "aoAlternarMenuLateral" para a
  // sidebar. Fecha sozinho ao mudar de página.
  const [menuAberto, setMenuAberto] = useState(false);
  // Fecha o menu quando o caminho muda, sem useEffect: ajustar estado
  // durante o render em resposta a uma prop que mudou é o padrão
  // recomendado pelo React (evita o re-render extra de um efeito).
  const [caminhoAnterior, setCaminhoAnterior] = useState(caminhoAtual);
  if (caminhoAtual !== caminhoAnterior) {
    setCaminhoAnterior(caminhoAtual);
    setMenuAberto(false);
  }

  async function terminarSessao() {
    const supabase = criarClienteSupabase();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-ink-100 bg-surface-card">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {aoAlternarMenuLateral && (
            <button
              type="button"
              onClick={aoAlternarMenuLateral}
              aria-label="Abrir menu"
              className="-ml-1 flex items-center justify-center rounded-lg p-2 text-ink-400 hover:bg-surface-muted hover:text-ink md:hidden"
            >
              <IconeMenu className="h-5 w-5" />
            </button>
          )}
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL dinâmico (Supabase Storage), fora do domínio conhecido em build-time
            <img
              src={logoUrl}
              alt={nomeEmpresa ?? "Logótipo do cliente"}
              className="h-8 w-8 shrink-0 rounded-lg object-contain bg-white border border-ink-100"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- ícone estático de 32px, sem ganho real com next/image aqui
            <img src="/icon.png" alt="Vértice Digital" className="h-8 w-8 shrink-0 rounded-lg" />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight text-ink">{nomeCompleto}</p>
            {nomeEmpresa && (
              <p className="hidden truncate text-xs leading-tight text-ink-300 sm:block">{nomeEmpresa}</p>
            )}
          </div>
        </div>

        {mostrarNavegacaoCliente && (
          <nav className="hidden items-center gap-1 md:flex">
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

        {/* Ações completas: só a partir de "md". Abaixo disso, tudo isto
            (abas incluídas, quando existem) muda-se para o menu hamburguer
            ao lado — ver painel aberto em baixo. Sem isto, esta linha
            (logo + nome + 3 abas + "Abrir ticket" + "Alterar password" +
            "Terminar sessão") nunca coube num telemóvel. */}
        <div className="hidden items-center gap-2 md:flex">
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

        {/* Hamburguer do menu próprio (cliente) ou das ações de conta
            (admin/dev, quando não há "aoAlternarMenuLateral" a competir
            pelo mesmo espaço — na área admin este botão substitui-se ao
            de cima e faz a mesma coisa: abre o painel com as ações). */}
        <button
          type="button"
          onClick={() => setMenuAberto((aberto) => !aberto)}
          aria-expanded={menuAberto}
          aria-controls="menu-cabecalho"
          aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
          className="flex items-center justify-center rounded-lg p-2 text-ink-400 hover:bg-surface-muted hover:text-ink md:hidden"
        >
          {menuAberto ? <IconeFechar className="h-5 w-5" /> : <IconeMenu className="h-5 w-5" />}
        </button>
      </div>

      {menuAberto && (
        <div id="menu-cabecalho" className="border-t border-ink-100 px-4 py-2 md:hidden">
          {mostrarNavegacaoCliente && (
            <nav className="flex flex-col gap-0.5 pb-2">
              {SECCOES_CLIENTE.map((seccao) => {
                const ativo = caminhoAtual === seccao.prefixo || caminhoAtual?.startsWith(`${seccao.prefixo}/`);
                return (
                  <Link
                    key={seccao.href}
                    href={seccao.href}
                    aria-current={ativo ? "page" : undefined}
                    className={clsx(
                      "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                      ativo ? "bg-accent-light text-accent-hover" : "text-ink-400 hover:bg-surface-muted hover:text-ink"
                    )}
                  >
                    {seccao.rotulo}
                  </Link>
                );
              })}
            </nav>
          )}
          <div className="flex flex-wrap items-center gap-2 border-t border-ink-100 pt-2">
            {mostrarNavegacaoCliente && <BotaoAbrirTicket />}
            <Link href="/change-password">
              <Botao variant="ghost" size="sm" type="button">
                Alterar password
              </Botao>
            </Link>
            <Botao variant="ghost" size="sm" onClick={terminarSessao}>
              Terminar sessão
            </Botao>
          </div>
        </div>
      )}
    </header>
  );
}
