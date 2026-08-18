// Tipos de domínio — puros, sem qualquer dependência de framework, base de
// dados ou fornecedor de LLM/notificações. Isto é o "vocabulário" partilhado
// entre core/, adapters/ e a camada web (app/).
//
// Nota de nomenclatura: nos tipos que espelham diretamente uma linha
// devolvida pelo Supabase (Perfil, Ticket, Mensagem, Conversa,
// EntradaBaseConhecimento, AtualizacaoTicket), os NOMES DOS CAMPOS
// mantêm-se em inglês/snake_case porque correspondem, sem qualquer
// transformação, às colunas das tabelas em supabase/schema.sql. Traduzi-los
// aqui sem também alterar o esquema da base de dados introduziria erros
// silenciosos em tempo de execução (o campo ficaria "undefined").

export type PapelUtilizador = "client" | "dev" | "admin";
export type TipoSite = "institutional" | "ecommerce" | "both";
export type PapelMensagem = "user" | "assistant" | "system";
export type OrigemMensagem = "history" | "knowledge_base" | "llm" | "ticket_ack";
export type EstadoTicket = "open" | "in_progress" | "resolved" | "closed";
export type PrioridadeTicket = "low" | "normal" | "high" | "urgent";
export type CanalNotificacao = "email" | "whatsapp";
export type EventoNotificacao =
  | "ticket_created"
  | "ticket_updated"
  | "ticket_resolved"
  | "credentials_issued";
export type EstadoNotificacao = "sent" | "failed" | "skipped";

export interface Perfil {
  id: string;
  role: PapelUtilizador;
  full_name: string;
  company_name: string | null;
  phone: string | null;
  site_type: TipoSite | null;
  must_change_password: boolean;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface EntradaBaseConhecimento {
  id: string;
  title: string;
  content: string;
  site_type: TipoSite;
  tags: string[];
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Conversa {
  id: string;
  client_id: string;
  subject: string | null;
  created_at: string;
  updated_at: string;
}

export interface Mensagem {
  id: string;
  conversation_id: string;
  role: PapelMensagem;
  content: string;
  source: OrigemMensagem | null;
  kb_reference_id: string | null;
  created_at: string;
}

export interface Ticket {
  id: string;
  conversation_id: string;
  message_id: string | null;
  client_id: string;
  assigned_dev_id: string | null;
  title: string;
  question: string;
  llm_answer: string | null;
  status: EstadoTicket;
  priority: PrioridadeTicket;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface AtualizacaoTicket {
  id: string;
  ticket_id: string;
  author_id: string;
  note: string;
  visible_to_client: boolean;
  created_at: string;
}

/** Utilizador já autenticado — resolvido pela camada web a partir do pedido HTTP. */
export interface UtilizadorAutenticado {
  id: string;
  email: string;
}

/** Resultado do caso de uso "fazer uma pergunta". */
export interface ResultadoPergunta {
  idConversa: string;
  mensagemUtilizador: Mensagem;
  mensagemResposta: Mensagem;
  ticket: Ticket | null;
}
