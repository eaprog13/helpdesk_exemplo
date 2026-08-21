import { clsx } from "clsx";

const estilosEstado: Record<string, string> = {
  // Estado do ticket — o SEU conjunto de cores próprio, nunca partilhado
  // com departamento nem prioridade (ver dept.*/prio.* em tailwind.config.ts).
  open: "bg-warning/10 text-warning",
  in_progress: "bg-accent-light text-accent-hover",
  resolved: "bg-success/10 text-success",
  closed: "bg-ink-100 text-ink-400",
  // Prioridade — rampa própria (dept.*/estado ficam de fora de propósito),
  // ver comentário em tailwind.config.ts. "urgent" fica no danger — já
  // não era partilhado por nenhum estado, sem necessidade de mudar.
  low: "bg-prio-low/10 text-prio-low",
  normal: "bg-prio-normal/10 text-prio-normal",
  high: "bg-prio-high/10 text-prio-high",
  urgent: "bg-danger/10 text-danger",
  // Conversa sem ticket associado — respondida sem intervenção humana (ver
  // src/lib/format/estadoConversa.ts).
  auto: "bg-success/10 text-success",
  // Departamento de um ticket (ver core/types.ts, Departamento) — paleta
  // própria (dept.* em tailwind.config.ts), nunca partilhada com estado
  // nem prioridade: um cartão de ticket mostra os três lado a lado.
  desenvolvimento: "bg-dept-dev/10 text-dept-dev",
  marketing: "bg-dept-marketing/10 text-dept-marketing",
  design: "bg-dept-design/10 text-dept-design",
  geral: "bg-dept-geral/10 text-dept-geral",
  por_triar: "bg-ink-100 text-ink-400",
  // Tipo(s) de produto do cliente / de um artigo da KB (ver core/types.ts,
  // TipoSite) — tons neutros, não é um "estado", é só categoria.
  institutional: "bg-accent-light text-accent-hover",
  ecommerce: "bg-success/10 text-success",
  web_app: "bg-warning/10 text-warning",
  mobile_app: "bg-danger/10 text-danger",
  other: "bg-ink-50 text-ink-400",
};

// Prioridade em português desde a raiz (crítica/alta/média/baixa) — os
// valores guardados na BD continuam em inglês (low/normal/high/urgent,
// ver supabase/schema.sql) por não valer a pena uma migração só para
// mudar um rótulo que só aparece aqui.
const rotulosEstado: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em curso",
  resolved: "Resolvido",
  closed: "Fechado",
  low: "Baixa",
  normal: "Média",
  high: "Alta",
  urgent: "Crítica",
  auto: "Resolvido automaticamente",
  desenvolvimento: "Desenvolvimento",
  marketing: "Marketing Digital",
  design: "Branding/Design",
  geral: "Geral",
  por_triar: "Por atribuir",
  institutional: "Site Institucional",
  ecommerce: "Loja Online",
  web_app: "Aplicação Web",
  mobile_app: "Mobile App",
  other: "Outros",
};

export function Distintivo({ value }: { value: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        estilosEstado[value] ?? "bg-ink-100 text-ink-400"
      )}
    >
      {rotulosEstado[value] ?? value}
    </span>
  );
}
