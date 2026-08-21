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
/**
 * Departamento — usado para dois fins: (1) catalogar a que área pertence
 * um artigo da base de conhecimento, (2) filtrar quem pode receber um
 * ticket na atribuição automática (ver core/services/ticketService.ts).
 * `null`/ausente num ticket significa "Por triar" — nunca entra na
 * atribuição automática até alguém lhe definir departamento à mão.
 */
export type Departamento = "desenvolvimento" | "marketing" | "design" | "geral";
/**
 * Tipo de produto que o cliente tem com a Vértice, ou a que tipo de produto
 * um artigo da KB se aplica — ver Perfil.site_type e
 * EntradaBaseConhecimento.site_type. Um cliente pode ter mais do que um
 * (ex.: site institucional E loja online), por isso aparece sempre como
 * array, nunca como valor único — "both" não existe como valor (ver
 * supabase/migration_tipos_site_multiplos.sql).
 */
export type TipoSite = "institutional" | "ecommerce" | "web_app" | "mobile_app" | "other";
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
  /**
   * Tipo(s) de produto que o cliente TEM contratado com a Vértice (Site
   * institucional/Loja online/Aplicação Web/Mobile App/Outros) — o
   * "serviço" mostrado em /admin/clients. Nunca vazio para um cliente já
   * criado (obrigatório no formulário). Não confundir com `department`
   * abaixo, que é só organização interna do admin.
   */
  site_type: TipoSite[];
  must_change_password: boolean;
  logo_url: string | null;
  /**
   * Organização interna do admin — em dev/admin, que equipa(s) a pessoa
   * integra (decide elegibilidade na atribuição automática de tickets,
   * ver Departamento); em client, um agrupamento interno só para o admin
   * (nunca usado na atribuição, nunca mostrado ao cliente como "serviço"
   * — isso é site_type acima). `[]` = nenhum definido.
   */
  department: Departamento[];
  created_at: string;
  updated_at: string;
}

export interface EntradaBaseConhecimento {
  id: string;
  title: string;
  content: string;
  /** A que tipo(s) de produto este artigo se aplica. `[]` = genérico, aplica-se a todos (ver TipoSite). */
  site_type: TipoSite[];
  tags: string[];
  is_published: boolean;
  /** Catalogação editorial — ver Departamento. */
  department: Departamento | null;
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
  /** `null` = "Por triar" — ver Departamento. */
  department: Departamento | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  /**
   * Quantas vezes o cliente devolveu este ticket ("preciso de mais alguma
   * coisa" — ver responderClienteTicket em core/services/ticketService.ts).
   * Nunca apagado (ao contrário de resolved_at) — usado no dashboard de
   * estatísticas como proxy de satisfação do cliente.
   */
  reopened_count: number;
}

export interface AtualizacaoTicket {
  id: string;
  ticket_id: string;
  author_id: string;
  note: string;
  visible_to_client: boolean;
  created_at: string;
}

export interface AnexoTicket {
  id: string;
  ticket_id: string;
  uploaded_by: string;
  file_path: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
}

/** Anexo de ticket já com URL temporário (assinado) para mostrar/descarregar — gerado a pedido, nunca guardado. */
export interface AnexoTicketComUrl extends AnexoTicket {
  url: string;
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
