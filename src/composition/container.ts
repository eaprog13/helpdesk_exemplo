import "server-only";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import type { Dependencias } from "@/core/deps";
import type { FornecedorLlm } from "@/core/ports/llm";

import { RepositorioPerfilSupabase } from "@/adapters/supabase/profileRepository";
import { RepositorioConversaSupabase } from "@/adapters/supabase/conversationRepository";
import { RepositorioMensagemSupabase } from "@/adapters/supabase/messageRepository";
import { RepositorioBaseConhecimentoSupabase } from "@/adapters/supabase/knowledgeBaseRepository";
import { RepositorioTicketSupabase } from "@/adapters/supabase/ticketRepository";
import { RepositorioAtualizacaoTicketSupabase } from "@/adapters/supabase/ticketUpdateRepository";
import { RepositorioAnexoTicketSupabase } from "@/adapters/supabase/ticketAttachmentRepository";
import { RepositorioRegistoNotificacaoSupabase } from "@/adapters/supabase/notificationLogRepository";
import { FornecedorGestaoIdentidadeSupabase } from "@/adapters/supabase/identityAdminProvider";
import { RepositorioArmazenamentoSupabase } from "@/adapters/supabase/storageRepository";

import { FornecedorLlmAnthropic } from "@/adapters/llm/anthropicProvider";
import { FornecedorLlmOpenAi } from "@/adapters/llm/openaiProvider";
import { FornecedorLlmGemini } from "@/adapters/llm/geminiProvider";
import { FornecedorLlmGroq } from "@/adapters/llm/groqProvider";

import { RemetenteEmailResend } from "@/adapters/notifications/resendEmailSender";
import { RemetenteWhatsAppTwilio } from "@/adapters/notifications/twilioWhatsAppSender";

/**
 * ═══════════════════════════════════════════════════════════════════════
 * Raiz de composição (composition root).
 *
 * Este é o ÚNICO ficheiro de toda a aplicação onde se escolhe QUAL
 * implementação concreta (Supabase, Anthropic/OpenAI/Gemini, Resend,
 * Twilio, …) satisfaz cada contrato (port) definido em src/core/ports.
 *
 * Para trocar de base de dados: escrever novos adaptadores em
 * src/adapters/<fornecedor>/ que implementem as interfaces de
 * src/core/ports/repositories.ts, e substituir os "new Repositorio...Supabase"
 * abaixo pelos novos. O código em src/core/services e nas rotas não muda
 * uma linha.
 *
 * Para trocar de LLM: já não é preciso sequer mexer aqui — basta mudar a
 * variável de ambiente LLM_PROVIDER ("anthropic" | "openai" | "gemini" |
 * "groq").
 * ═══════════════════════════════════════════════════════════════════════
 */

function construirFornecedorLlm(): FornecedorLlm {
  const fornecedor = (process.env.LLM_PROVIDER ?? "anthropic").toLowerCase();

  switch (fornecedor) {
    case "gemini":
      // "Gemini" aqui é sempre a Gemini Developer API (chave gerada em
      // aistudio.google.com — Google AI Studio), nunca a Vertex AI (essa
      // exige projeto GCP + service account, outro fluxo de autenticação
      // completamente diferente e não implementado aqui).
      return new FornecedorLlmGemini(
        process.env.GEMINI_API_KEY ?? "",
        process.env.GEMINI_MODEL ?? "gemini-3.8-flash"
      );
    case "openai":
      return new FornecedorLlmOpenAi(
        process.env.OPENAI_API_KEY ?? "",
        process.env.OPENAI_MODEL ?? "gpt-6-luna"
      );
    case "groq":
      // Lista de modelos disponíveis muda com frequência (a Groq
      // descontinua modelos antigos) — confirmar em
      // https://console.groq.com/docs/models ou GET /openai/v1/models
      // antes de mudar. "openai/gpt-oss-120b" (bom para qualidade de
      // texto) e "openai/gpt-oss-20b" (mais rápido/barato) estavam
      // ambos disponíveis em 2026-08-20.
      return new FornecedorLlmGroq(
        process.env.GROQ_API_KEY ?? "",
        process.env.GROQ_MODEL ?? "openai/gpt-oss-120b"
      );
    case "anthropic":
    default:
      return new FornecedorLlmAnthropic(
        process.env.ANTHROPIC_API_KEY ?? "",
        process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5"
      );
  }
}

let dependenciasEmCache: Dependencias | null = null;

/**
 * Devolve o contentor de dependências, construído uma única vez por
 * instância do servidor (cache simples em memória — sem framework de DI).
 * Chamável a partir de qualquer camada de entrega (rotas Next.js hoje;
 * Express/Fastify/CLI amanhã, sem alterações a este ficheiro).
 */
export function obterContentor(): Dependencias {
  if (dependenciasEmCache) return dependenciasEmCache;

  // Hoje: um único cliente Supabase (service role) serve todos os
  // repositórios. Para trocar de BD, estas linhas passam a instanciar o
  // driver do novo fornecedor (ex.: `new Pool(...)` do node-postgres).
  const bd = criarClienteAdmin();

  dependenciasEmCache = {
    perfis: new RepositorioPerfilSupabase(bd),
    conversas: new RepositorioConversaSupabase(bd),
    mensagens: new RepositorioMensagemSupabase(bd),
    baseConhecimento: new RepositorioBaseConhecimentoSupabase(bd),
    tickets: new RepositorioTicketSupabase(bd),
    atualizacoesTicket: new RepositorioAtualizacaoTicketSupabase(bd),
    anexosTicket: new RepositorioAnexoTicketSupabase(bd),
    registoNotificacoes: new RepositorioRegistoNotificacaoSupabase(bd),
    identidade: new FornecedorGestaoIdentidadeSupabase(bd.auth.admin),
    armazenamento: new RepositorioArmazenamentoSupabase(bd),
    llm: construirFornecedorLlm(),
    email: new RemetenteEmailResend(
      process.env.RESEND_API_KEY ?? "",
      process.env.EMAIL_FROM ?? "Apoio ao Cliente Vértice Digital <suporte@vertice-digital.example>",
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    ),
    whatsapp: new RemetenteWhatsAppTwilio(
      process.env.TWILIO_ACCOUNT_SID ?? "",
      process.env.TWILIO_AUTH_TOKEN ?? "",
      process.env.TWILIO_WHATSAPP_FROM ?? "",
      process.env.WHATSAPP_NOTIFICATIONS_ENABLED === "true"
    ),
    // Ativo por omissão (ver core/services/chatService.ts, lapidarSeAtivo)
    // — não é funcionalidade experimental. RESPOSTA_HUMANIZADA_ATIVA=false
    // no .env é só um interruptor de emergência (ex.: fornecedor de LLM
    // em baixo), não o estado normal. Só afeta a "lapidação" de texto já
    // pronto — gerarResposta (resposta nova, fundamentada na KB) não
    // depende deste interruptor.
    respostaHumanizadaAtiva: process.env.RESPOSTA_HUMANIZADA_ATIVA !== "false",
  };

  return dependenciasEmCache;
}
