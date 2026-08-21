import type { Dependencias } from "@/core/deps";
import type { Conversa, Mensagem, ResultadoPergunta, UtilizadorAutenticado, Perfil } from "@/core/types";

// Ordem de resolução de cada pergunta (regra de negócio — vive aqui, não
// nos adaptadores de BD/LLM):
//   0) É só conversa social (saudação, agradecimento)? Resposta simpática
//      fixa, sem histórico/KB/ticket — ver ehConversaSocial abaixo.
//   1) Histórico do próprio cliente — já perguntou algo parecido antes?
//   2) Contexto do site da Vértice — a base de conhecimento tem UM artigo
//      confiante (rank ≥ LIMIAR_RELEVANCIA_BASE_CONHECIMENTO)?
//   3) Nem histórico nem um artigo confiante — mas já tentámos menos de
//      MAX_TENTATIVAS_LLM_SEGUIDAS vezes seguidas nesta conversa? A LLM
//      tenta ajudar, fundamentada SÓ nos candidatos reais da KB (mesmo que
//      nenhum sozinho seja confiante) — nunca no seu próprio conhecimento
//      geral sobre a Vértice Digital (ver PROMPT_SISTEMA em
//      adapters/llm/prompt.ts). Se o contexto não chegar, a própria LLM
//      diz isso com honestidade em vez de inventar. Conta como "tentativa"
//      — ver contarTentativasLlmSeguidas.
//   4) Nem histórico, nem KB confiante, e já esgotámos as tentativas
//      seguidas → mensagem fixa a avisar que foi encaminhado para a
//      equipa, e abre-se sempre ticket.
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
//     pergunta): rank ~0.3–0.35 — devem continuar a cair para a abertura
//     de ticket
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

// Quantas tentativas seguidas de resposta fundamentada pela LLM (origem
// "llm", ver passo 3 acima) antes de desistir e abrir ticket — decidido
// com o cliente a 2026-08-20: dar espaço para a LLM ajudar com o que a KB
// tem, em vez de abrir ticket logo à primeira pergunta sem match
// confiante. "Seguidas" = sem nenhuma resposta confiante (histórico/KB)
// nem ticket a interromper a sequência, ver contarTentativasLlmSeguidas.
const MAX_TENTATIVAS_LLM_SEGUIDAS = 3;

/**
 * Conta quantas respostas "llm" (fundamentada, ver passo 3 no comentário
 * grande acima) seguidas já houve nesta conversa, a contar do fim para
 * trás — pára na primeira mensagem do assistente que NÃO seja "llm"
 * (resposta confiante de histórico/KB, saudação, ou um ticket já aberto),
 * porque isso significa que esse fio da conversa já foi resolvido (ou já
 * escalado) e uma pergunta nova a seguir merece tentativas do zero.
 */
async function contarTentativasLlmSeguidas(dependencias: Dependencias, idConversa: string): Promise<number> {
  const mensagens = await dependencias.mensagens.listarPorConversa(idConversa);
  let seguidas = 0;
  for (let i = mensagens.length - 1; i >= 0; i--) {
    const mensagem = mensagens[i];
    if (!mensagem || mensagem.role !== "assistant") continue; // só interessam as respostas, não as perguntas do cliente
    if (mensagem.source !== "llm") break;
    seguidas++;
  }
  return seguidas;
}

// ── 0) Deteção de conversa social (saudação/bem-estar/agradecimento/
// despedida/confirmação) ────────────────────────────────────────────────
// Regra fixa, sem LLM nenhuma envolvida — nunca pode falhar/dar erro, e
// evita gastar uma pesquisa a histórico/KB (e, sobretudo, abrir um ticket)
// só porque o cliente disse "Bom dia". Deliberadamente conservador: só
// considera "social" uma mensagem CURTA em que TODAS as frases batem
// certo com uma da lista abaixo — qualquer coisa a mais ("Bom dia, o meu
// site caiu") cai sempre no fluxo normal de pergunta real.
//
// Categorizado (não uma lista plana) para dar à LLM uma base mais rica e
// específica para embelezar — "Bom dia, tudo bem?" combina saudação +
// bem-estar, e a resposta reflete as duas partes, não uma frase genérica
// única repetida sempre. A lista de frases por categoria é generosa de
// propósito (várias formas comuns de dizer o mesmo em português de
// Portugal), para reconhecer o máximo de variações reais de conversa.
type TipoConversaSocial = "saudacao" | "bem_estar" | "agradecimento" | "confirmacao" | "despedida";

const FRASES_POR_TIPO: Record<TipoConversaSocial, string[]> = {
  saudacao: [
    "bom dia",
    "boa tarde",
    "boa noite",
    "boas",
    "boa",
    "ola",
    "ol",
    "oi",
    "oii",
    "oie",
    "hey",
    "hello",
    "hi",
    "yo",
    "e ai",
    "eae",
    "salve",
  ],
  bem_estar: [
    "tudo bem",
    "tudo bom",
    "tudo fixe",
    "tudo em ordem",
    "tudo bem contigo",
    "tudo bem consigo",
    "tudo bem por ai",
    "como estas",
    "como esta",
    "como estas tu",
    "como vai",
    "como vais",
    "como e que estas",
    "como te encontras",
    "esta tudo bem",
    "esta tudo bom",
  ],
  agradecimento: [
    "obrigado",
    "obrigada",
    "obg",
    "obgdo",
    "obgda",
    "muito obrigado",
    "muito obrigada",
    "muitissimo obrigado",
    "muitissimo obrigada",
    "agradecido",
    "agradecida",
    "agradeco",
    "muito agradecido",
    "muito agradecida",
  ],
  confirmacao: [
    "ok",
    "okay",
    "esta bem",
    "certo",
    "perfeito",
    "otimo",
    "fixe",
    "entendido",
    "compreendido",
    "de nada",
    "com certeza",
    "sem duvida",
    "por favor",
  ],
  despedida: [
    "ate logo",
    "ate ja",
    "ate amanha",
    "ate breve",
    "adeus",
    "tchau",
    "cumprimentos",
    "um abraco",
    "abraco",
    "fico por aqui",
    "vou andando",
    "boa continuacao",
  ],
};

// Frase-base por categoria, na ordem em que aparecem numa resposta
// combinada (ex.: saudação + bem-estar). São o "conteúdo base" entregue a
// lapidarSeAtivo — a LLM só as reescreve para soarem como UMA resposta
// natural e coesa, nunca acrescenta factos novos.
const ORDEM_TIPOS_SOCIAIS: TipoConversaSocial[] = ["saudacao", "bem_estar", "agradecimento", "confirmacao", "despedida"];
const RESPOSTA_BASE_POR_TIPO: Record<TipoConversaSocial, string> = {
  saudacao: "Olá! Em que posso ajudá-lo hoje?",
  bem_estar: "Estou bem, obrigado por perguntar! E o que o traz por cá hoje?",
  agradecimento: "De nada! Foi um prazer ajudar.",
  confirmacao: "Perfeito, fico à disposição se precisar de mais alguma coisa.",
  despedida: "Até já! Continue a contar com a Vértice Digital sempre que precisar.",
};

const MAX_PALAVRAS_CONVERSA_SOCIAL = 8;

function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos (marcas de combinação Unicode), mantém letras
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ") // pontuação vira espaço — "Bom dia! Tudo bem?" e "Bom dia, tudo bem?" têm de dar o mesmo resultado
    .replace(/\s+/g, " ")
    .trim();
}

// Frases tokenizadas (uma vez, no arranque) para a correspondência greedy
// por palavras abaixo — cada frase de FRASES_POR_TIPO vira a sua lista de
// palavras, para comparar sub-sequências de palavras da pergunta.
const FRASES_TOKENIZADAS: { tipo: TipoConversaSocial; palavras: string[] }[] = ORDEM_TIPOS_SOCIAIS.flatMap((tipo) =>
  FRASES_POR_TIPO[tipo].map((frase) => ({ tipo, palavras: frase.split(" ") }))
);
const MAX_PALAVRAS_FRASE = Math.max(...FRASES_TOKENIZADAS.map((f) => f.palavras.length));

/** Tenta casar a frase mais longa possível (depois a seguinte mais curta, etc.) a partir de "posicao". */
function casarFraseNaPosicao(palavras: string[], posicao: number): { tipo: TipoConversaSocial; comprimento: number } | null {
  const maxAqui = Math.min(MAX_PALAVRAS_FRASE, palavras.length - posicao);
  for (let comprimento = maxAqui; comprimento >= 1; comprimento--) {
    const candidato = palavras.slice(posicao, posicao + comprimento).join(" ");
    const encontrada = FRASES_TOKENIZADAS.find((f) => f.palavras.length === comprimento && f.palavras.join(" ") === candidato);
    if (encontrada) return { tipo: encontrada.tipo, comprimento };
  }
  return null;
}

/**
 * Percorre a pergunta palavra a palavra e devolve os tipos de conversa
 * social encontrados (saudação, bem-estar, agradecimento, confirmação,
 * despedida), na ordem em que aparecem — ou null se não for (só) conversa
 * social, incluindo o caso de vir totalmente vazia. Casa a frase mais
 * longa possível em cada posição (ex.: prefere "tudo bem por ai" a só
 * "tudo bem", se ambas cabem) e NÃO depende de pontuação nenhuma entre
 * frases — "Bom dia tudo bem" (sem vírgula) tem de reconhecer as duas
 * partes tal como "Bom dia, tudo bem?" reconhece. A palavra solta "e"
 * entre duas frases reconhecidas é ignorada como conector ("bom dia e
 * tudo bem"), nunca faz a deteção falhar sozinha.
 *
 * Deliberadamente conservador (ver comentário grande acima): uma única
 * palavra que não encaixe em nenhuma frase (e não seja o conector "e") já
 * chega para devolver null e cair no fluxo normal de pergunta.
 */
function detetarTiposConversaSocial(pergunta: string): TipoConversaSocial[] | null {
  const normalizado = normalizarTexto(pergunta);
  if (!normalizado) return null;

  const palavras = normalizado.split(" ");
  if (palavras.length > MAX_PALAVRAS_CONVERSA_SOCIAL) return null;

  const tipos: TipoConversaSocial[] = [];
  let posicao = 0;
  while (posicao < palavras.length) {
    const encontrada = casarFraseNaPosicao(palavras, posicao);
    if (encontrada) {
      if (!tipos.includes(encontrada.tipo)) tipos.push(encontrada.tipo);
      posicao += encontrada.comprimento;
      continue;
    }
    if (palavras[posicao] === "e") {
      posicao += 1; // conector entre duas frases sociais — ignora-se
      continue;
    }
    return null; // palavra não reconhecida → não é (só) conversa social
  }

  return tipos.length > 0 ? tipos : null;
}

/** Verifica se a pergunta é só conversa social — ver detetarTiposConversaSocial. */
export function ehConversaSocial(pergunta: string): boolean {
  return detetarTiposConversaSocial(pergunta) !== null;
}

/**
 * Constrói o texto-base (a entregar a lapidarSeAtivo) para os tipos de
 * conversa social detetados — combina uma frase por tipo, na ordem
 * ORDEM_TIPOS_SOCIAIS, para uma mensagem como "Bom dia, tudo bem?" gerar
 * uma resposta que cobre as duas partes, não uma saudação genérica única.
 */
function construirRespostaSocial(tipos: TipoConversaSocial[]): string {
  return ORDEM_TIPOS_SOCIAIS.filter((tipo) => tipos.includes(tipo))
    .map((tipo) => RESPOSTA_BASE_POR_TIPO[tipo])
    .join(" ");
}

// ── 3) Mensagem fixa quando nem histórico nem KB têm resposta ───────────
const RESPOSTA_TICKET_ABERTO =
  "Obrigado pela sua pergunta! Ainda não tenho uma resposta imediata para este caso — " +
  "encaminhei o seu pedido para a nossa equipa técnica, que lhe responde o mais brevemente possível.";

export interface DadosPergunta {
  utilizador: UtilizadorAutenticado;
  perfil: Perfil;
  pergunta: string;
  idConversa?: string;
}

export class ErroAcessoNegado extends Error {}
export class ErroNaoEncontrado extends Error {}

/**
 * Passa uma resposta já correta e conhecida (histórico, base de
 * conhecimento, saudação fixa ou aviso de ticket aberto) pela LLM para
 * soar mais natural à pergunta concreta que foi feita — sem mudar nenhum
 * facto (ver FornecedorLlm.humanizarResposta). Este é hoje o ÚNICO papel
 * da LLM em todo o fluxo do chat — nunca gera resposta a partir do seu
 * próprio conhecimento (ver a nota grande antes de fazerPergunta).
 *
 * Ativo por omissão (Dependencias.respostaHumanizadaAtiva,
 * RESPOSTA_HUMANIZADA_ATIVA no .env) — só existe como interruptor de
 * emergência (ex.: fornecedor de LLM em baixo ou a dar problemas), não
 * como funcionalidade experimental. Se a chamada falhar por qualquer
 * motivo, devolve sempre a resposta original em vez de rebentar o pedido
 * — o cliente fica sem a "lapidação", nunca sem resposta nenhuma.
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
 * 0) Se for só conversa social (saudação/agradecimento), responde logo,
 *    sem histórico/KB/ticket (ver ehConversaSocial).
 * 1) Verifica se já respondemos a algo parecido no histórico do cliente.
 * 2) Se não, procura resposta no contexto interno da Vértice (base de conhecimento).
 * 3) Se ainda assim não houver resposta, avisa que foi encaminhado e abre
 *    sempre um ticket para os devs — a LLM NUNCA tenta responder ao
 *    conteúdo a partir do seu próprio conhecimento (ver FornecedorLlm.
 *    gerarResposta em core/ports/llm.ts: existe no port, mas este fluxo
 *    já não a chama).
 * 4) Notifica o cliente (email/WhatsApp) sobre o ticket criado.
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

  // ── 0) Só conversa social? Responde já, sem histórico/KB/ticket ────────
  const tiposConversaSocial = detetarTiposConversaSocial(pergunta);
  if (tiposConversaSocial) {
    const mensagemUtilizadorSocial = await dependencias.mensagens.criar({
      idConversa: conversa.id,
      papel: "user",
      conteudo: pergunta,
    });
    const conteudoRespostaSocial = await lapidarSeAtivo(
      dependencias,
      pergunta,
      construirRespostaSocial(tiposConversaSocial),
      perfil.company_name
    );
    const mensagemRespostaSocial = await dependencias.mensagens.criar({
      idConversa: conversa.id,
      papel: "assistant",
      conteudo: conteudoRespostaSocial,
      // Sem "origem": não é uma resposta com fonte para citar (histórico/
      // KB/ticket) — é só conversa, não faz sentido mostrar um selo de
      // proveniência (ver rotuloOrigem em components/chat/MessageBubble.tsx).
      origem: null,
      idReferenciaBaseConhecimento: null,
    });
    return { idConversa: conversa.id, mensagemUtilizador: mensagemUtilizadorSocial, mensagemResposta: mensagemRespostaSocial, ticket: null };
  }

  // ── 2) Histórico do próprio cliente: já perguntou algo parecido? ───────
  // Feito ANTES de guardar a pergunta atual, para nunca se comparar consigo
  // própria. Só considera perguntas anteriores que já têm resposta — um
  // aviso de "ticket aberto" (source='ticket_ack') nunca conta como
  // resposta, isso é filtrado já na função SQL search_client_history (ver
  // supabase/migration_historico_ignorar_ticket_ack.sql); sem esse
  // filtro, uma pergunta genuinamente nunca respondida ficaria presa a
  // devolver sempre o mesmo aviso genérico, sem nunca abrir um ticket novo.
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
  let origem: "history" | "knowledge_base" | "llm" | "ticket_ack";
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
      // ── 5) Sem artigo confiante → tenta a LLM fundamentada, até
      // MAX_TENTATIVAS_LLM_SEGUIDAS vezes seguidas nesta conversa ────────
      const tentativasSeguidas = await contarTentativasLlmSeguidas(dependencias, conversa.id);
      let respostaLlmFundamentada: string | null = null;
      if (tentativasSeguidas < MAX_TENTATIVAS_LLM_SEGUIDAS) {
        try {
          respostaLlmFundamentada = await dependencias.llm.gerarResposta({
            pergunta,
            // Mesmo candidatos fracos (abaixo do limiar de confiança) —
            // a LLM decide se são úteis; nunca inventa o que não estiver
            // aqui nem no seu conhecimento geral sobre a Vértice Digital
            // (ver PROMPT_SISTEMA em adapters/llm/prompt.ts).
            contextoRelacionado: correspondenciasBaseConhecimento.map((m) => ({ titulo: m.title, conteudo: m.content })),
            nomeEmpresa: perfil.company_name,
            tiposSite: perfil.site_type,
          });
        } catch (erro) {
          // Rede de segurança: falha da LLM (sem chave, rate limit, etc.)
          // nunca rebenta o pedido do cliente — cai para o aviso fixo de
          // ticket abaixo, como se as tentativas se tivessem esgotado.
          console.error("[fazerPergunta] falha ao gerar resposta fundamentada, a abrir ticket:", erro);
        }
      }

      if (respostaLlmFundamentada) {
        conteudoResposta = respostaLlmFundamentada;
        origem = "llm";
      } else {
        // Tentativas esgotadas (ou a chamada falhou) → avisa e abre
        // ticket. Só lapida (ver lapidarSeAtivo) a mensagem fixa
        // RESPOSTA_TICKET_ABERTO — não é a LLM a tentar responder ao
        // conteúdo, é só a reescrever para soar natural.
        conteudoResposta = await lapidarSeAtivo(dependencias, pergunta, RESPOSTA_TICKET_ABERTO, perfil.company_name);
        origem = "ticket_ack";
      }
    }
  }

  const mensagemResposta = await dependencias.mensagens.criar({
    idConversa: conversa.id,
    papel: "assistant",
    conteudo: conteudoResposta,
    origem,
    idReferenciaBaseConhecimento,
  });

  // ── 6) Sem resposta no histórico nem na KB, abrir ticket para os devs ──
  if (origem === "ticket_ack") {
    // Departamento fica deliberadamente por definir (null → "Por atribuir",
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
    // sempre para um admin triar à mão.
    ticket = await dependencias.tickets.criar({
      idConversa: conversa.id,
      idMensagem: mensagemUtilizador.id,
      idCliente: utilizador.id,
      titulo: pergunta.slice(0, 120),
      pergunta,
      // Já não há resposta gerada pela LLM ao conteúdo — só a mensagem
      // fixa de "encaminhado para a equipa" (ver conteudoResposta acima),
      // que não é o que este campo destina (contexto para o dev). null é
      // o correto: sinaliza claramente "sem tentativa de resposta".
      respostaLlm: null,
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
