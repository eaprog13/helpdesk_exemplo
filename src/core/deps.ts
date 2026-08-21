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
   * Liga/desliga a "lapidação" pela LLM de texto já correto/aprovado
   * (histórico, KB, saudação fixa, aviso de ticket aberto — ver
   * FornecedorLlm.humanizarResposta em core/ports/llm.ts e
   * core/services/chatService.ts, lapidarSeAtivo). Não afeta
   * FornecedorLlm.gerarResposta (a resposta fundamentada na KB, ver
   * mesmo ficheiro) — essa corre sempre que aplicável, independentemente
   * deste interruptor. Decidido aqui, não dentro de core/services, para o
   * core continuar sem ler variáveis de ambiente diretamente. Ativo
   * por omissão — RESPOSTA_HUMANIZADA_ATIVA=false no .env é só um
   * interruptor de emergência.
   */
  respostaHumanizadaAtiva: boolean;
}
