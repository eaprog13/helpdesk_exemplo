import type { Dependencias } from "@/core/deps";
import type { Conversa, Mensagem, ResultadoPergunta, UtilizadorAutenticado, Perfil } from "@/core/types";

// Ordem de resolução de cada pergunta (regra de negócio — vive aqui, não
// nos adaptadores de BD/LLM):
//   1) Histórico do próprio cliente — já perguntou algo parecido antes?
//   2) Contexto do site da Vértice — a base de conhecimento tem resposta?
//   3) LLM — só como último recurso, e nesse caso abre-se sempre ticket.
//
// Os limiares abaixo são a escala do ts_rank_cd do Postgres (ou o
// equivalente que o adaptador de BD escolhido devolver); histórico exige
// uma correspondência mais próxima do que a KB, porque estamos a reutilizar
// uma resposta já dada sem a rever de novo.
//
// Recalibrados a 2026-08-19, depois de search_knowledge_base/
// search_client_history passarem a devolver rank × cobertura (ver
// supabase/migration_flexibilidade_pesquisa.sql, v2) — testados
// diretamente ao RPC com um conjunto de perguntas reais e adversariais:
//   • correspondências genuínas (tópico 1:1 com um artigo): rank 0.6–0.83
//     (ex.: "loja online" → 0.83; "prazo de entrega de projeto" → 0.75)
//   • correspondências parciais/ambíguas (só partilham uma categoria
//     genérica, ex. "site institucional", sem a KB ter resposta real à
//     pergunta): rank ~0.3–0.35 — devem continuar a cair para a LLM
//   • coincidências sem relação nenhuma (ex. perguntas sobre Bitcoin, CEO,
//     estacionamento — só correspondem por "Vértice Digital" aparecer no
//     título de quase todos os artigos): rank ~0.07–0.46, nunca acima
// 0.5 fica acima de toda a coincidência observada e abaixo de toda a
// correspondência genuína testada — reavaliar se a KB crescer muito ou se
// aparecerem falsos positivos/negativos reais em produção.
const LIMIAR_RELEVANCIA_HISTORICO = 0.55;
const MAX_RESULTADOS_HISTORICO = 3;
const LIMIAR_RELEVANCIA_BASE_CONHECIMENTO = 0.5;
const MAX_RESULTADOS_BASE_CONHECIMENTO = 3;

export interface DadosPergunta {
  utilizador: UtilizadorAutenticado;
  perfil: Perfil;
  pergunta: string;
  idConversa?: string;
}

export class ErroAcessoNegado extends Error {}
export class ErroNaoEncontrado extends Error {}

/**
 * Passa uma resposta já correta (histórico ou base de conhecimento) pela
 * LLM para soar mais natural à pergunta concreta que foi feita — sem
 * mudar nenhum facto (ver FornecedorLlm.humanizarResposta). Só ativo com
 * Dependencias.respostaHumanizadaAtiva (RESPOSTA_HUMANIZADA_ATIVA no
 * .env — desligado por omissão): ainda estamos a validar os limiares de
 * deteção de contexto acima, e uma pergunta mais elaborada ou com
 * palavras fora do vocabulário habitual pode confundir esta reescrita.
 * Se a chamada falhar por qualquer motivo, devolve sempre a resposta
 * original em vez de rebentar o pedido — o cliente fica sem a
 * "lapidação", nunca sem resposta nenhuma.
 */
async function lapidarSeAtivo(
  dependencias: Dependencias,
  pergunta: string,
  respostaBase: string,
  nomeEmpresa: string | null
): Promise<string> {
  if (!dependencias.respostaHumanizadaAtiva) return respostaBase;
  try {
    return await dependencias.llm.humanizarResposta({ pergunta, respostaBase, nomeEmpresa });
  } catch (erro) {
    console.error("[lapidarSeAtivo] falha ao lapidar a resposta, a devolver a original:", erro);
    return respostaBase;
  }
}

/**
 * Caso de uso central: o cliente faz uma pergunta.
 * 1) Verifica se já respondemos a algo parecido no histórico do cliente.
 * 2) Se não, procura resposta no contexto interno da Vértice (base de conhecimento).
 * 3) Se ainda assim não houver resposta suficientemente boa, pergunta a uma LLM.
 * 4) Sempre que se recorre à LLM, abre um ticket para os devs.
 * 5) Notifica o cliente (email/WhatsApp) sobre o ticket criado.
 *
 * Função pura em termos de infraestrutura: só fala com o mundo exterior
 * através de `dependencias` (ports). Não sabe se corre em Next.js, Express,
 * um worker ou um teste — por isso é fácil de testar e de mover para outro
 * framework HTTP no futuro.
 */
export async function fazerPergunta(dependencias: Dependencias, dados: DadosPergunta): Promise<ResultadoPergunta> {
  const { utilizador, perfil, pergunta } = dados;

  // ── 1) Obter/criar conversa ────────────────────────────────────────────
  let conversa = dados.idConversa ? await dependencias.conversas.obterPorId(dados.idConversa) : null;

  if (conversa && conversa.client_id !== utilizador.id) {
    throw new ErroNaoEncontrado("Conversa não encontrada.");
  }
  if (!conversa) {
    conversa = await dependencias.conversas.criar(utilizador.id, pergunta.slice(0, 80));
  }

  // ── 2) Histórico do próprio cliente: já perguntou algo parecido? ───────
  // Feito ANTES de guardar a pergunta atual, para nunca se comparar consigo
  // própria. Só considera perguntas anteriores que já têm resposta.
  const correspondenciasHistorico = await dependencias.mensagens.pesquisarHistoricoCliente(
    utilizador.id,
    pergunta,
    MAX_RESULTADOS_HISTORICO
  );
  const melhorCorrespondenciaHistorico = correspondenciasHistorico.find((m) => !!m.resposta) ?? null;
  const correspondenciaHistoricoComConfianca =
    !!melhorCorrespondenciaHistorico && melhorCorrespondenciaHistorico.relevancia >= LIMIAR_RELEVANCIA_HISTORICO;

  // ── 3) Guardar a mensagem do cliente ───────────────────────────────────
  const mensagemUtilizador = await dependencias.mensagens.criar({
    idConversa: conversa.id,
    papel: "user",
    conteudo: pergunta,
  });

  let conteudoResposta: string;
  let origem: "history" | "knowledge_base" | "llm";
  let idReferenciaBaseConhecimento: string | null = null;
  let ticket: ResultadoPergunta["ticket"] = null;
  let correspondenciasBaseConhecimento: Awaited<ReturnType<Dependencias["baseConhecimento"]["pesquisar"]>> = [];

  if (correspondenciaHistoricoComConfianca && melhorCorrespondenciaHistorico?.resposta) {
    // Já respondemos a algo parecido a este cliente — reutiliza essa resposta,
    // sem voltar a pesquisar a KB nem a chamar a LLM (a lapidação abaixo é
    // só de estilo, não uma nova pesquisa).
    conteudoResposta = await lapidarSeAtivo(dependencias, pergunta, melhorCorrespondenciaHistorico.resposta, perfil.company_name);
    origem = "history";
  } else {
    // ── 4) Contexto do site da Vértice: pesquisar a base de conhecimento ────
    correspondenciasBaseConhecimento = await dependencias.baseConhecimento.pesquisar(
      pergunta,
      perfil.site_type,
      MAX_RESULTADOS_BASE_CONHECIMENTO
    );
    const melhorCorrespondenciaBaseConhecimento = correspondenciasBaseConhecimento[0] ?? null;
    const correspondenciaBaseConhecimentoComConfianca =
      !!melhorCorrespondenciaBaseConhecimento &&
      melhorCorrespondenciaBaseConhecimento.rank >= LIMIAR_RELEVANCIA_BASE_CONHECIMENTO;

    if (correspondenciaBaseConhecimentoComConfianca && melhorCorrespondenciaBaseConhecimento) {
      // Resposta encontrada no contexto interno — sem necessidade de LLM
      // para a RESPONDER (só, opcionalmente, para a lapidar) nem ticket.
      conteudoResposta = await lapidarSeAtivo(dependencias, pergunta, melhorCorrespondenciaBaseConhecimento.content, perfil.company_name);
      origem = "knowledge_base";
      idReferenciaBaseConhecimento = melhorCorrespondenciaBaseConhecimento.id;
    } else {
      // ── 5) Sem resposta no histórico nem na KB → cai para a LLM ─────────
      conteudoResposta = await dependencias.llm.gerarResposta({
        pergunta,
        contextoRelacionado: correspondenciasBaseConhecimento.map((m) => ({ titulo: m.title, conteudo: m.content })),
        nomeEmpresa: perfil.company_name,
        tiposSite: perfil.site_type,
      });
      origem = "llm";
    }
  }

  const mensagemResposta = await dependencias.mensagens.criar({
    idConversa: conversa.id,
    papel: "assistant",
    conteudo: conteudoResposta,
    origem,
    idReferenciaBaseConhecimento,
  });

  // ── 6) Sempre que se recorreu à LLM, abrir ticket para os devs ─────────
  if (origem === "llm") {
    // Departamento fica deliberadamente por definir (null → "Por triar",
    // ver core/services/ticketService.ts). Chegar aqui já significa que
    // nem o histórico nem a KB tiveram confiança suficiente para
    // responder (ver os limiares acima) — ou seja, os candidatos da
    // pesquisa à KB que ainda restam são exatamente a zona onde, segundo a
    // calibração destes limiares, correspondências genuínas parciais
    // (rank ~0.3–0.35) e coincidências irrelevantes (rank até ~0.46, ex.:
    // uma pergunta sobre Bitcoin "bater" com um artigo só por
    // partilhar "Vértice Digital") se misturam sem uma fronteira limpa.
    // Um limiar mais baixo só para classificar departamento arriscava
    // exatamente o cenário que se quer evitar: encaminhar um problema
    // técnico para o departamento errado com aparência de confiança. Fica
    // para um admin triar à mão (ou, no futuro, uma classificação da
    // própria LLM já chamada aqui — sinal semântico, não só correspondência
    // de palavras — mas isso é trabalho novo a validar, não este limiar.)
    ticket = await dependencias.tickets.criar({
      idConversa: conversa.id,
      idMensagem: mensagemUtilizador.id,
      idCliente: utilizador.id,
      titulo: pergunta.slice(0, 120),
      pergunta,
      respostaLlm: conteudoResposta,
      departamento: null,
    });

    // ── 7) Acompanhamento do cliente por email/WhatsApp ────────────────────
    await notificarEventoTicket(dependencias, "ticket_created", perfil, utilizador.email, ticket);
  }

  return { idConversa: conversa.id, mensagemUtilizador, mensagemResposta, ticket };
}

/**
 * Orquestra o envio de notificações (email sempre; WhatsApp se o cliente
 * tiver telefone associado — exceto em "ticket_updated", só email por
 * agora: mensagem genérica de "já assumido", sem WhatsApp ainda ligado a
 * ela em core/ports/notifications.ts) e regista cada tentativa para
 * auditoria. Partilhado entre chatService (ticket criado) e ticketService
 * (assumido/resolvido).
 */
export async function notificarEventoTicket(
  dependencias: Dependencias,
  evento: "ticket_created" | "ticket_updated" | "ticket_resolved",
  perfil: Pick<Perfil, "id" | "full_name" | "phone">,
  email: string,
  ticket: NonNullable<ResultadoPergunta["ticket"]>,
  notaResolucao?: string
) {
  const resultadoEmail =
    evento === "ticket_created"
      ? await dependencias.email.enviarTicketCriado(email, perfil.full_name, ticket)
      : evento === "ticket_updated"
        ? await dependencias.email.enviarTicketAssumido(email, perfil.full_name, ticket)
        : await dependencias.email.enviarTicketResolvido(email, perfil.full_name, ticket, notaResolucao ?? "");

  await dependencias.registoNotificacoes.registar({
    idCliente: perfil.id,
    idTicket: ticket.id,
    canal: "email",
    evento,
    estado: resultadoEmail.estado,
    erro: resultadoEmail.erro,
  });

  if (perfil.phone && evento !== "ticket_updated") {
    const resultadoWhatsApp =
      evento === "ticket_created"
        ? await dependencias.whatsapp.enviarTicketCriado(perfil.phone, perfil.full_name, ticket)
        : await dependencias.whatsapp.enviarTicketResolvido(perfil.phone, perfil.full_name, ticket);

    await dependencias.registoNotificacoes.registar({
      idCliente: perfil.id,
      idTicket: ticket.id,
      canal: "whatsapp",
      evento,
      estado: resultadoWhatsApp.estado,
      erro: resultadoWhatsApp.erro,
    });
  }
}

/** Carrega o histórico da conversa mais recente do cliente — usado para restaurar o chat. */
export async function obterConversaMaisRecente(dependencias: Dependencias, idCliente: string) {
  const conversa = await dependencias.conversas.obterMaisRecentePorCliente(idCliente);
  if (!conversa) return { idConversa: null, mensagens: [] };
  const mensagens = await dependencias.mensagens.listarPorConversa(conversa.id);
  return { idConversa: conversa.id, mensagens };
}

/**
 * Começa sempre uma conversa nova (nunca reaproveita uma existente) —
 * chamado no momento em que o cliente inicia sessão, para que cada login
 * arranque com uma conversa em branco. As conversas anteriores não se
 * perdem: ficam acessíveis em "Histórico" (ver listarConversas).
 */
export async function iniciarNovaConversa(dependencias: Dependencias, idCliente: string): Promise<Conversa> {
  const agora = new Date();
  const assunto = `Conversa de ${agora.toLocaleDateString("pt-PT")} às ${agora.toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
  return dependencias.conversas.criar(idCliente, assunto);
}

/**
 * Lista as conversas de um cliente (mais recente primeiro) — para o
 * separador de histórico. Cliente só pode listar as próprias; staff
 * (admin/dev) tem de indicar de que cliente quer ver o histórico.
 */
export async function listarConversas(
  dependencias: Dependencias,
  perfil: Perfil,
  idClienteAlvo?: string
): Promise<Conversa[]> {
  if (perfil.role === "client") {
    return dependencias.conversas.listarPorCliente(perfil.id);
  }
  if (!idClienteAlvo) {
    throw new ErroAcessoNegado("É necessário indicar de que cliente se quer ver o histórico.");
  }
  return dependencias.conversas.listarPorCliente(idClienteAlvo);
}

/**
 * Mostra uma conversa específica com as suas mensagens — só consulta (as
 * conversas do histórico não recebem novas perguntas; para continuar a
 * falar, usa-se sempre a conversa atual, a mais recente). Cliente só pode
 * ver as próprias conversas; staff pode ver as de qualquer cliente.
 */
export async function obterConversaComMensagens(
  dependencias: Dependencias,
  perfil: Perfil,
  idConversa: string
): Promise<{ conversa: Conversa; mensagens: Mensagem[] }> {
  const conversa = await dependencias.conversas.obterPorId(idConversa);
  if (!conversa) throw new ErroNaoEncontrado("Conversa não encontrada.");
  if (perfil.role === "client" && conversa.client_id !== perfil.id) {
    throw new ErroAcessoNegado("Acesso negado.");
  }
  const mensagens = await dependencias.mensagens.listarPorConversa(idConversa);
  return { conversa, mensagens };
}
