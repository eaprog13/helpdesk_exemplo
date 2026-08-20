"use client";

import { useState, type KeyboardEvent, type SVGProps } from "react";
import { clsx } from "clsx";
import { Cartao } from "@/components/ui/Card";

// Ícones em SVG (não emoji) para os 3 desenharem sempre da mesma forma em
// qualquer sistema operativo/browser — um emoji como 🔑 ou ✏️ muda de
// desenho consoante a plataforma e nem sempre "aponta" na mesma direção.
// Os três aqui seguem o mesmo traço (stroke, sem preenchimento) e a mesma
// diagonal inferior-esquerda → superior-direita, para lerem como um
// conjunto, não três estilos diferentes.
function atributosIcone(p?: SVGProps<SVGSVGElement>) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...p,
  };
}

function IconeSiteEmBaixo(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...atributosIcone(p)}>
      <path d="M3 3l18 18" />
      <path d="M8.5 16.5a5 5 0 0 1 7 0" />
      <path d="M5 13a10 10 0 0 1 5.17-2.74" />
      <path d="M19 13a10 10 0 0 0-3.24-2.31" />
      <path d="M2 8.82a15 15 0 0 1 4.17-2.65" />
      <path d="M21.98 8.82a15 15 0 0 0-9-4.68" />
      <path d="M12 20h.01" />
    </svg>
  );
}

function IconeAlterarConteudo(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...atributosIcone(p)}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function IconeAcesso(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...atributosIcone(p)}>
      <circle cx="7" cy="15" r="4" />
      <path d="M9.8 12.2 20 2" />
      <path d="M17 5l3 3" />
      <path d="M14 8l2 2" />
    </svg>
  );
}

interface SugestaoRapida {
  Icone: (p: SVGProps<SVGSVGElement>) => JSX.Element;
  titulo: string;
  pergunta: string;
  /** Passo a passo mostrado no verso do cartão — resumo do artigo da base de conhecimento correspondente. */
  passos: string[];
}

// As 3 dúvidas mais comuns dos clientes. O texto de "pergunta" corresponde
// literalmente ao título do artigo da base de conhecimento (ver
// supabase/seed_knowledge_base_operacional.sql) — se, mesmo depois do
// passo a passo, o cliente perguntar isto no chat, cai direto na resposta
// certa sem precisar de ticket (ver limiares em core/services/chatService.ts).
// Os "passos" são o mesmo conteúdo desses artigos, reescrito como lista.
const SUGESTOES_RAPIDAS: SugestaoRapida[] = [
  {
    Icone: IconeSiteEmBaixo,
    titulo: "Site em baixo",
    pergunta: "O meu site ou loja online parece estar em baixo",
    passos: [
      "Experimente aceder a partir de outro dispositivo, rede (ex.: dados móveis em vez de wifi) ou browser.",
      "Confirme se outros sites abrem normalmente a partir da sua ligação.",
      "Se o problema persistir, reporte-nos a hora exata em que reparou e, se possível, uma captura de ecrã.",
    ],
  },
  {
    Icone: IconeAlterarConteudo,
    titulo: "Alterar conteúdo",
    pergunta: "Como altero textos, imagens ou informações simples no meu site ou loja",
    passos: [
      "Aceda ao painel de administração do seu site ou loja.",
      "Edite diretamente texto, imagens, preços ou dados de contacto — não precisa de nos pedir.",
      "Alteração mais complexa (nova página, secção ou design)? Peça-nos através deste centro de apoio.",
    ],
  },
  {
    Icone: IconeAcesso,
    titulo: "Não consigo entrar",
    pergunta: "Não consigo entrar no painel de administração do meu site ou loja",
    passos: [
      "Password esquecida? Use \"Esqueceu-se da password?\" no ecrã de login para a repor.",
      "Confirme que o email é exatamente o mesmo com que a conta foi criada (maiúsculas/minúsculas incluídas).",
      "A conta pode ainda não estar ativada, ou ter sido desativada por um administrador da sua empresa.",
      "Continua sem conseguir entrar? Contacte-nos indicando o email com que costuma entrar.",
    ],
  },
];

export function CartoesSugestoesRapidas({ aoEscolher }: { aoEscolher: (pergunta: string) => void }) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {SUGESTOES_RAPIDAS.map((sugestao) => (
        <CartaoSugestaoVirável key={sugestao.titulo} sugestao={sugestao} aoEscolher={aoEscolher} />
      ))}
    </div>
  );
}

function CartaoSugestaoVirável({
  sugestao,
  aoEscolher,
}: {
  sugestao: SugestaoRapida;
  aoEscolher: (pergunta: string) => void;
}) {
  const [virado, setVirado] = useState(false);
  const { Icone, titulo, pergunta, passos } = sugestao;

  function alternar() {
    setVirado((anterior) => !anterior);
  }

  function aoPressionarTecla(evento: KeyboardEvent<HTMLDivElement>) {
    if (evento.key === "Enter" || evento.key === " ") {
      evento.preventDefault();
      alternar();
    }
  }

  return (
    <div className="[perspective:1200px]">
      {/* Não é um <button> porque o verso tem, lá dentro, uma ação própria
          ("Perguntar no chat") — um botão dentro de outro botão não é HTML
          válido, por isso o cartão vira com role="button" no div. */}
      <div
        role="button"
        tabIndex={0}
        aria-pressed={virado}
        aria-label={`${titulo} — clique para ver o passo a passo`}
        onClick={alternar}
        onKeyDown={aoPressionarTecla}
        className={clsx(
          "relative h-56 cursor-pointer transition-transform duration-500 [transform-style:preserve-3d]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
          virado && "[transform:rotateY(180deg)]"
        )}
      >
        {/* Frente */}
        <Cartao className="absolute inset-0 flex flex-col p-4 [backface-visibility:hidden] hover:shadow-md">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-light text-accent-hover">
            <Icone className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm font-medium text-ink">{titulo}</p>
          <p className="mt-1 line-clamp-2 text-xs text-ink-400">{pergunta}</p>
          <span className="mt-auto pt-2 text-[11px] font-medium text-accent-hover">Ver passo a passo →</span>
        </Cartao>

        {/* Verso */}
        <Cartao className="absolute inset-0 flex flex-col overflow-y-auto scrollbar-thin p-4 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <p className="text-xs font-semibold text-ink">{titulo}</p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-xs text-ink-400">
            {passos.map((passo) => (
              <li key={passo}>{passo}</li>
            ))}
          </ol>
          <button
            type="button"
            onClick={(evento) => {
              evento.stopPropagation();
              aoEscolher(pergunta);
            }}
            className="mt-auto self-start pt-2 text-[11px] font-medium text-accent-hover underline"
          >
            Ainda com dúvidas? Perguntar no chat
          </button>
        </Cartao>
      </div>
    </div>
  );
}
