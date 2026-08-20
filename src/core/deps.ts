// Agregador de todas as dependências (ports) que os serviços do core
// precisam. Uma única instância disto é construída em
// src/composition/container.ts, escolhendo as implementações concretas
// (Supabase, Anthropic/OpenAI/Gemini, Resend, Twilio, …) consoante as
// variáveis de ambiente. Os serviços em core/services nunca constroem
// clientes de infraestrutura — recebem sempre "dependencias" já resolvido.

import type {
  RepositorioConversa,
  RepositorioBaseConhecimento,
  RepositorioMensagem,
  RepositorioRegistoNotificacao,
  RepositorioPerfil,
  RepositorioTicket,
  RepositorioAtualizacaoTicket,
  RepositorioAnexoTicket,
} from "@/core/ports/repositories";
import type { FornecedorGestaoIdentidade } from "@/core/ports/identity";
import type { FornecedorLlm } from "@/core/ports/llm";
import type { RemetenteEmail, RemetenteWhatsApp } from "@/core/ports/notifications";
import type { RepositorioArmazenamento } from "@/core/ports/storage";

export interface Dependencias {
  perfis: RepositorioPerfil;
  conversas: RepositorioConversa;
  mensagens: RepositorioMensagem;
  baseConhecimento: RepositorioBaseConhecimento;
  tickets: RepositorioTicket;
  atualizacoesTicket: RepositorioAtualizacaoTicket;
  anexosTicket: RepositorioAnexoTicket;
  registoNotificacoes: RepositorioRegistoNotificacao;
  identidade: FornecedorGestaoIdentidade;
  llm: FornecedorLlm;
  email: RemetenteEmail;
  whatsapp: RemetenteWhatsApp;
  armazenamento: RepositorioArmazenamento;
  /**
   * Liga/desliga a "lapidação" de respostas de histórico/KB pela LLM (ver
   * FornecedorLlm.humanizarResposta em core/ports/llm.ts) — decidido aqui,
   * não dentro de core/services, para o core continuar sem ler variáveis
   * de ambiente diretamente. Controlado por RESPOSTA_HUMANIZADA_ATIVA no
   * .env; desligado por omissão enquanto os limiares de deteção de
   * contexto (LIMIAR_RELEVANCIA_HISTORICO/BASE_CONHECIMENTO em
   * chatService.ts) ainda estão a ser validados.
   */
  respostaHumanizadaAtiva: boolean;
}
