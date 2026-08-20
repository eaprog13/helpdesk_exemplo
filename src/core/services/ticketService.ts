import type { Dependencias } from "@/core/deps";
import type {
  UtilizadorAutenticado,
  Perfil,
  Ticket,
  PrioridadeTicket,
  EstadoTicket,
  Departamento,
  AnexoTicket,
  AnexoTicketComUrl,
} from "@/core/types";
import { ErroAcessoNegado, ErroNaoEncontrado, notificarEventoTicket } from "./chatService";

export { ErroAcessoNegado, ErroNaoEncontrado };

/**
 * Escolhe, dentro de um departamento, o dev com menos tickets ativos
 * (open/in_progress) neste momento — regra rígida, nunca ultrapassada: só
 * entram na comparação devs desse departamento (ver Departamento em
 * core/types.ts), nunca de outro, mesmo que tenham menos carga. Em
 * empate, desempata por quem não recebe um ticket novo há mais tempo
 * (nunca ter recebido nenhum conta como "há mais tempo" que qualquer
 * data real). Sem nenhum dev nesse departamento, devolve null — o ticket
 * fica com departamento definido mas sem dev atribuído, à espera de um
 * admin atribuir à mão.
 *
 * "geral" é uma exceção deliberada: nunca entra neste algoritmo, mesmo
 * havendo devs com esse departamento — um ticket "Geral" (ou "não tenho a
 * certeza") é sempre para um admin decidir à mão quem trata, nunca uma
 * escolha automática por carga.
 */
async function escolherDevPorMenorCarga(
  dependencias: Dependencias,
  departamento: Departamento
): Promise<string | null> {
  if (departamento === "geral") return null;

  const [primeiroDev, ...restoDaEquipa] = await dependencias.perfis.listarEquipa(departamento);
  if (!primeiroDev) return null;

  const carga = await dependencias.tickets.obterCargaTrabalhoPorDev([primeiroDev, ...restoDaEquipa].map((dev) => dev.id));
  const cargaPadrao = { ativos: 0, ultimaAtribuicaoEm: null as string | null };

  let escolhido = primeiroDev;
  for (const dev of restoDaEquipa) {
    const cargaDev = carga[dev.id] ?? cargaPadrao;
    const cargaEscolhido = carga[escolhido.id] ?? cargaPadrao;
    if (cargaDev.ativos < cargaEscolhido.ativos) {
      escolhido = dev;
    } else if (cargaDev.ativos === cargaEscolhido.ativos) {
      const devNuncaRecebeu = cargaDev.ultimaAtribuicaoEm === null;
      const devMaisAntigo =
        devNuncaRecebeu ||
        (cargaEscolhido.ultimaAtribuicaoEm !== null && cargaDev.ultimaAtribuicaoEm! < cargaEscolhido.ultimaAtribuicaoEm);
      if (devMaisAntigo) escolhido = dev;
    }
  }
  return escolhido.id;
}

// Mesmos limites definidos no bucket "ticket-attachments" (supabase/schema.sql)
// — validar também aqui dá um erro claro e imediato, em vez de esperar pela
// rejeição silenciosa do Storage.
export const TIPOS_ANEXO_PERMITIDOS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf",
};
export const TAMANHO_MAXIMO_ANEXO = 5 * 1024 * 1024; // 5MB

export class TipoAnexoInvalidoError extends Error {}

/**
 * O cliente abre um ticket diretamente (sem passar pelo chat/LLM) — ex.:
 * já sabe que precisa da equipa técnica e não quer esperar por uma
 * resposta automática. Fica associado à conversa mais recente do cliente
 * (a mesma que o chat usa) para o pedido aparecer com o resto do histórico;
 * se ainda não existir nenhuma, cria-se uma. Sem resposta de LLM associada
 * (llm_answer fica a null) — não há nenhuma, o cliente foi direto ao ponto.
 *
 * O próprio cliente escolhe o departamento (ecrã "Abrir ticket") — é a
 * fonte mais fiável que existe, por isso a atribuição automática por
 * menor carga corre já aqui, sem passar por nenhuma fila de triagem.
 * `departamento: null` ("não tenho a certeza") cai em "Por triar", como
 * qualquer ticket sem departamento confiante.
 */
export async function abrirTicketManual(
  dependencias: Dependencias,
  utilizador: UtilizadorAutenticado,
  perfil: Perfil,
  dados: { titulo: string; descricao: string; departamento: Departamento | null }
): Promise<Ticket> {
  let conversa = await dependencias.conversas.obterMaisRecentePorCliente(perfil.id);
  if (!conversa) {
    conversa = await dependencias.conversas.criar(perfil.id, dados.titulo.slice(0, 80));
  }

  const mensagem = await dependencias.mensagens.criar({
    idConversa: conversa.id,
    papel: "user",
    conteudo: dados.descricao,
  });

  const idDevAtribuido = dados.departamento
    ? await escolherDevPorMenorCarga(dependencias, dados.departamento)
    : null;

  const ticket = await dependencias.tickets.criar({
    idConversa: conversa.id,
    idMensagem: mensagem.id,
    idCliente: perfil.id,
    titulo: dados.titulo,
    pergunta: dados.descricao,
    respostaLlm: null,
    departamento: dados.departamento,
    idDevAtribuido,
  });

  await notificarEventoTicket(dependencias, "ticket_created", perfil, utilizador.email, ticket);

  return ticket;
}

/**
 * Um admin dá departamento a um ticket "Por atribuir" (nasceu do chat —
 * ver o comentário sobre classificação em core/services/chatService.ts,
 * fazerPergunta) — e, assim que ganha departamento, corre a mesma
 * atribuição automática por menor carga usada em qualquer outro ticket.
 * Reatribuir o dev à mão continua possível depois, via atualizarTicket.
 *
 * Só admin (ver /api/tickets/:id/triagem) — um ticket sem departamento não
 * pertence a nenhum dev sob o princípio de menor privilégio (ver
 * devPodeVerTicket), por isso nunca chega sequer a aparecer a um dev para
 * o triar.
 */
export async function triarTicket(
  dependencias: Dependencias,
  idTicket: string,
  departamento: Departamento
): Promise<Ticket> {
  const idDevAtribuido = await escolherDevPorMenorCarga(dependencias, departamento);
  const ticket = await dependencias.tickets.atualizar(idTicket, { departamento, idDevAtribuido });
  if (!ticket) throw new ErroNaoEncontrado("Ticket não encontrado.");
  return ticket;
}

/** Lista devs/admins (toda a equipa, ou filtrada por departamento) — para o seletor de atribuição manual. */
export async function listarEquipa(dependencias: Dependencias, departamento?: Departamento): Promise<Perfil[]> {
  return dependencias.perfis.listarEquipa(departamento);
}

/**
 * Um dev vê o ticket ou não, consoante o princípio de menor privilégio
 * (só admin tem visibilidade total — ver listarTickets/
 * obterTicketComAtualizacoes abaixo): department deste dev inclui o
 * department do ticket, OU o ticket já lhe está atribuído (cobre o caso
 * de um admin o atribuir manualmente fora do departamento habitual do
 * dev — nesse caso continua a precisar de o ver/trabalhar). Um ticket
 * "Por atribuir" (sem department) não pertence a nenhum departamento, por
 * isso nunca é visível a um dev — só a um admin (ver triarTicket).
 */
function devPodeVerTicket(perfilDev: Perfil, ticket: Ticket): boolean {
  return ticket.assigned_dev_id === perfilDev.id || (!!ticket.department && perfilDev.department.includes(ticket.department));
}

/**
 * Lista tickets: clientes só veem os próprios; admin vê todos; dev só vê
 * os do(s) seu(s) departamento(s) (ou já atribuídos a si) — ver
 * devPodeVerTicket.
 */
export async function listarTickets(dependencias: Dependencias, perfil: Perfil): Promise<Ticket[]> {
  if (perfil.role === "client") {
    return dependencias.tickets.listarPorCliente(perfil.id);
  }
  const todos = await dependencias.tickets.listarTodos();
  if (perfil.role === "dev") {
    return todos.filter((t) => devPodeVerTicket(perfil, t));
  }
  return todos;
}

export async function obterTicketComAtualizacoes(dependencias: Dependencias, perfil: Perfil, idTicket: string) {
  const ticket = await dependencias.tickets.obterPorId(idTicket);
  if (!ticket) throw new ErroNaoEncontrado("Ticket não encontrado.");
  if (perfil.role === "client" && ticket.client_id !== perfil.id) {
    throw new ErroAcessoNegado("Acesso negado.");
  }
  if (perfil.role === "dev" && !devPodeVerTicket(perfil, ticket)) {
    throw new ErroAcessoNegado("Este ticket não é do seu departamento.");
  }

  const ehEquipa = perfil.role === "admin" || perfil.role === "dev";
  const [atualizacoes, anexos] = await Promise.all([
    dependencias.atualizacoesTicket.listarPorTicket(idTicket, { apenasVisivelParaCliente: !ehEquipa }),
    listarAnexosComUrl(dependencias, idTicket),
  ]);

  return { ticket, atualizacoes, anexos };
}

async function listarAnexosComUrl(dependencias: Dependencias, idTicket: string): Promise<AnexoTicketComUrl[]> {
  const anexos = await dependencias.anexosTicket.listarPorTicket(idTicket);
  return Promise.all(
    anexos.map(async (anexo): Promise<AnexoTicketComUrl> => ({
      ...anexo,
      url: await dependencias.armazenamento.obterUrlAnexoTicket(anexo.file_path),
    }))
  );
}

/**
 * Anexa um ficheiro (captura de ecrã, PDF) a um ticket — o cliente dono do
 * ticket ou staff. Chamado logo quando o ticket é aberto (aviso no chat) ou
 * mais tarde a partir do detalhe do pedido, para preparar o terreno para
 * quem vai analisar (ver components/ticket/AnexosTicket.tsx).
 */
export async function adicionarAnexoTicket(
  dependencias: Dependencias,
  utilizador: UtilizadorAutenticado,
  perfil: Perfil,
  dados: { idTicket: string; nomeFicheiro: string; conteudo: Buffer; tipoConteudo: string }
): Promise<AnexoTicketComUrl> {
  const ticket = await dependencias.tickets.obterPorId(dados.idTicket);
  if (!ticket) throw new ErroNaoEncontrado("Ticket não encontrado.");
  const ehEquipa = perfil.role === "admin" || perfil.role === "dev";
  if (!ehEquipa && ticket.client_id !== perfil.id) {
    throw new ErroAcessoNegado("Acesso negado.");
  }
  if (perfil.role === "dev" && !devPodeVerTicket(perfil, ticket)) {
    throw new ErroAcessoNegado("Este ticket não é do seu departamento.");
  }

  const extensao = TIPOS_ANEXO_PERMITIDOS[dados.tipoConteudo];
  if (!extensao) {
    throw new TipoAnexoInvalidoError(
      `Tipo de ficheiro não suportado (${dados.tipoConteudo}). Use PNG, JPEG, WEBP ou PDF.`
    );
  }
  if (dados.conteudo.byteLength > TAMANHO_MAXIMO_ANEXO) {
    throw new TipoAnexoInvalidoError("O ficheiro excede o tamanho máximo de 5MB.");
  }

  const caminho = await dependencias.armazenamento.carregarAnexoTicket(dados.idTicket, {
    conteudo: dados.conteudo,
    tipoConteudo: dados.tipoConteudo,
    extensao,
  });

  const anexo: AnexoTicket = await dependencias.anexosTicket.criar({
    idTicket: dados.idTicket,
    idUtilizador: utilizador.id,
    caminhoFicheiro: caminho,
    nomeFicheiro: dados.nomeFicheiro,
    tipoConteudo: dados.tipoConteudo,
    tamanhoBytes: dados.conteudo.byteLength,
  });

  const url = await dependencias.armazenamento.obterUrlAnexoTicket(anexo.file_path);
  return { ...anexo, url };
}

export interface DadosAtualizacaoTicket {
  estado?: EstadoTicket;
  prioridade?: PrioridadeTicket;
  idDevAtribuido?: string | null;
  /** Correção manual do departamento sem repetir a atribuição automática — para isso, ver triarTicket(). */
  departamento?: Departamento | null;
  nota?: string;
  notaVisivelParaCliente?: boolean;
}

/**
 * Fluxo de estados de um ticket (ver também o README):
 *
 *   aberto (open) → em resolução (in_progress) → resolvido (resolved) → fechado (closed)
 *                                                        ↑______________________|
 *                                        (cliente pede mais info → volta a "em resolução")
 *
 * Um 'admin' pode saltar este fluxo (ex.: corrigir um engano) — só os devs
 * ficam limitados às transições abaixo, e só a partir do estado atual do
 * ticket. "resolved → closed" e "resolved → in_progress" (reabertura) NUNCA
 * são feitos por um dev/admin diretamente: são sempre resposta do cliente
 * (ver responderClienteTicket) — é o cliente que decide se o problema ficou
 * resolvido.
 */
const TRANSICOES_DEV: Partial<Record<EstadoTicket, EstadoTicket[]>> = {
  open: ["in_progress"],
  in_progress: ["resolved"],
};

/**
 * Só chamada quando quem pede a alteração é um 'dev' (admin nunca passa por
 * aqui — ver o comentário acima). Garante que o dev segue o fluxo definido
 * E que só mexe em tickets que são (ou podem passar a ser) seus.
 */
function validarTransicaoDev(ticketAtual: Ticket, perfilDev: Perfil, estadoAlvo: EstadoTicket) {
  const permitidos = TRANSICOES_DEV[ticketAtual.status] ?? [];
  if (!permitidos.includes(estadoAlvo)) {
    throw new ErroAcessoNegado(
      `Não é possível passar de "${ticketAtual.status}" a "${estadoAlvo}". O fluxo é: aberto → em resolução → resolvido; ` +
        `fechar o ticket ou devolvê-lo para resolução é sempre uma resposta do cliente.`
    );
  }
  if (ticketAtual.assigned_dev_id && ticketAtual.assigned_dev_id !== perfilDev.id) {
    throw new ErroAcessoNegado("Este ticket está atribuído a outro dev.");
  }
  if (ticketAtual.status === "open" && !ticketAtual.department) {
    // "Por triar" — precisa de departamento (ver triarTicket) antes de
    // qualquer dev o poder assumir.
    throw new ErroAcessoNegado('Este ticket ainda está "por atribuir" — dê-lhe um departamento antes de o assumir.');
  }
  if (
    ticketAtual.status === "open" &&
    !ticketAtual.assigned_dev_id &&
    ticketAtual.department &&
    !perfilDev.department.includes(ticketAtual.department)
  ) {
    throw new ErroAcessoNegado("Este ticket é de outro departamento.");
  }
}

/**
 * Apenas staff. Atualiza estado/prioridade/atribuição e/ou acrescenta uma
 * nota. Quando o estado passa a "resolved", exige sempre uma nota (é a
 * resposta entregue ao cliente — ver comentário acima sobre o fluxo) e
 * dispara o acompanhamento do cliente (email/WhatsApp). Um 'dev' só pode
 * mover o estado seguindo esse fluxo (ver validarTransicaoDev); um 'admin'
 * pode fazer qualquer transição, incluindo as reservadas ao cliente
 * (fechar/reabrir), para corrigir enganos.
 */
export async function atualizarTicket(
  dependencias: Dependencias,
  utilizadorEquipa: UtilizadorAutenticado,
  perfilEquipa: Perfil,
  dados: DadosAtualizacaoTicket & { idTicket: string }
): Promise<Ticket> {
  const { idTicket, estado, prioridade, idDevAtribuido, departamento, nota, notaVisivelParaCliente } = dados;

  const ticketAtual = await dependencias.tickets.obterPorId(idTicket);
  if (!ticketAtual) throw new ErroNaoEncontrado("Ticket não encontrado.");
  if (perfilEquipa.role === "dev" && !devPodeVerTicket(perfilEquipa, ticketAtual)) {
    // Mesmo princípio de menor privilégio da visualização (ver
    // devPodeVerTicket acima) — sem isto, um dev conseguia alterar
    // nota/prioridade de um ticket de outro departamento só por lhe saber
    // o id, mesmo sem nunca o ver listado.
    throw new ErroAcessoNegado("Este ticket não é do seu departamento.");
  }

  const mudaEstado = !!estado && estado !== ticketAtual.status;

  if (mudaEstado && perfilEquipa.role !== "admin") {
    validarTransicaoDev(ticketAtual, perfilEquipa, estado);
  }
  if (mudaEstado && estado === "resolved" && !nota?.trim()) {
    throw new ErroAcessoNegado("É necessária uma nota com a resposta entregue ao cliente para marcar como resolvido.");
  }

  const alteracoes: Parameters<Dependencias["tickets"]["atualizar"]>[1] = {};
  if (estado) alteracoes.estado = estado;
  if (prioridade) alteracoes.prioridade = prioridade;
  if (idDevAtribuido !== undefined) {
    alteracoes.idDevAtribuido = idDevAtribuido;
  } else if (mudaEstado && estado === "in_progress" && perfilEquipa.role === "dev" && !ticketAtual.assigned_dev_id) {
    // Dev "assume" um ticket por triar do seu departamento — autoatribui-se
    // sem precisar de passar primeiro por um admin.
    alteracoes.idDevAtribuido = utilizadorEquipa.id;
  }
  if (departamento !== undefined) alteracoes.departamento = departamento;
  if (estado === "resolved") alteracoes.dataResolucao = new Date().toISOString();

  let ticket =
    Object.keys(alteracoes).length > 0
      ? await dependencias.tickets.atualizar(idTicket, alteracoes)
      : ticketAtual;

  if (!ticket) throw new ErroNaoEncontrado("Ticket não encontrado.");

  if (nota) {
    await dependencias.atualizacoesTicket.criar({
      idTicket,
      idAutor: utilizadorEquipa.id,
      nota,
      // A resposta que resolve o ticket tem sempre de chegar ao cliente,
      // independentemente da checkbox — é o que o fluxo pede.
      visivelParaCliente: estado === "resolved" ? true : notaVisivelParaCliente ?? false,
    });
  }

  // Mensagem genérica assim que o ticket passa a "em resolução" com dev
  // atribuído — o cliente só precisa de saber que já há alguém a tratar do
  // caso, sem detalhe nenhum (ver enviarTicketAssumido). Só na transição
  // real (mudaEstado), nunca ao repetir o mesmo estado.
  if (mudaEstado && estado === "in_progress" && ticket.assigned_dev_id) {
    const perfilCliente = await dependencias.perfis.obterPorId(ticket.client_id);
    const emailCliente = await dependencias.identidade.obterEmailPorId(ticket.client_id);

    if (perfilCliente && emailCliente) {
      await notificarEventoTicket(dependencias, "ticket_updated", perfilCliente, emailCliente, ticket);
    }
  }

  if (estado === "resolved") {
    const perfilCliente = await dependencias.perfis.obterPorId(ticket.client_id);
    const emailCliente = await dependencias.identidade.obterEmailPorId(ticket.client_id);

    if (perfilCliente && emailCliente) {
      await notificarEventoTicket(
        dependencias,
        "ticket_resolved",
        perfilCliente,
        emailCliente,
        ticket,
        nota ?? "O pedido foi resolvido pela nossa equipa."
      );
    }
  }

  return ticket;
}

/**
 * A resposta do CLIENTE a um ticket "resolved" — o único ponto do fluxo em
 * que o cliente, não a equipa, decide o próximo estado (ver o comentário
 * sobre o fluxo em atualizarTicket): confirma que ficou resolvido (fecha o
 * ticket) ou explica o que ainda falta (devolve para "em resolução", com
 * essa explicação anexada, mantendo o mesmo dev responsável). Só é possível
 * a partir de "resolved" — antes disso ainda não há nada para o cliente
 * validar; depois de "closed" o ciclo já terminou.
 */
export async function responderClienteTicket(
  dependencias: Dependencias,
  utilizador: UtilizadorAutenticado,
  perfil: Perfil,
  dados: { idTicket: string; acao: "fechar" | "reabrir"; nota?: string }
): Promise<Ticket> {
  if (perfil.role !== "client") {
    throw new ErroAcessoNegado("Só o cliente pode responder a este ticket.");
  }

  const ticketAtual = await dependencias.tickets.obterPorId(dados.idTicket);
  if (!ticketAtual) throw new ErroNaoEncontrado("Ticket não encontrado.");
  if (ticketAtual.client_id !== perfil.id) throw new ErroAcessoNegado("Acesso negado.");
  if (ticketAtual.status !== "resolved") {
    throw new ErroAcessoNegado('Só é possível responder a um ticket no estado "resolvido".');
  }

  const nota = dados.nota?.trim() || "";
  if (dados.acao === "reabrir" && !nota) {
    throw new ErroAcessoNegado("Descreva o que ainda falta para reabrir o ticket.");
  }

  const ticket = await dependencias.tickets.atualizar(dados.idTicket, {
    estado: dados.acao === "fechar" ? "closed" : "in_progress",
    // Ao reabrir, o ticket volta a estar por resolver — limpa a data de
    // resolução anterior para uma futura reabertura/fecho ficar correta.
    dataResolucao: dados.acao === "reabrir" ? null : undefined,
  });
  if (!ticket) throw new ErroNaoEncontrado("Ticket não encontrado.");

  await dependencias.atualizacoesTicket.criar({
    idTicket: dados.idTicket,
    idAutor: utilizador.id,
    nota: nota || "O cliente confirmou a resolução do pedido.",
    visivelParaCliente: true,
  });

  return ticket;
}
