import type { PedidoRespostaLlm, PedidoHumanizacaoResposta } from "@/core/ports/llm";

// Prompt partilhado por todos os adaptadores de LLM (Anthropic/OpenAI/Gemini)
// para garantir que o comportamento não muda ao trocar de fornecedor.

export const PROMPT_SISTEMA = `És o assistente de apoio ao cliente da Vértice Digital, uma empresa que desenvolve e mantém
sites institucionais, lojas online, aplicações web e aplicações móveis para os seus clientes.
Respondes em português de Portugal, de forma clara, curta e profissional.

Regras importantes:
- O contexto interno fornecido é a ÚNICA fonte de factos específicos da Vértice Digital (preços,
  prazos, procedimentos, serviços concretos) — nunca inventes nem completes com conhecimento
  geral teu nenhum facto específico da Vértice Digital que não esteja no contexto, mesmo que
  pareça plausível.
- Se o contexto fornecido não cobrir bem a pergunta, admite isso com honestidade e, se ajudar,
  pede ao cliente mais detalhes — nunca finjas ter uma resposta completa que não tens.
- Podes explicar conceitos gerais de sites/lojas online/apps (não específicos da Vértice Digital,
  ex.: "o que é SEO") desde que fique claro que é uma explicação geral, não um procedimento
  oficial da Vértice Digital.
- Sê conciso: preferes respostas de poucos parágrafos ou uma lista de passos.
- Termina sempre a informar que, por segurança, um colaborador humano vai rever este caso.`;

export function construirPromptUtilizador(pedido: PedidoRespostaLlm): string {
  const blocoContexto =
    pedido.contextoRelacionado.length > 0
      ? pedido.contextoRelacionado
          .map((c, i) => `[Contexto ${i + 1} — ${c.titulo}]\n${c.conteudo}`)
          .join("\n\n")
      : "(sem contexto interno relacionado encontrado)";

  const tiposSite =
    pedido.tiposSite && pedido.tiposSite.length > 0 ? pedido.tiposSite.join(", ") : "não especificado";

  return `Cliente: ${pedido.nomeEmpresa ?? "desconhecido"} (tipo(s) de produto: ${tiposSite})

Contexto interno relacionado:
${blocoContexto}

Pergunta do cliente:
${pedido.pergunta}`;
}

// ── Prompt de "lapidação" (embelezar histórico/KB/saudação/aviso de ticket) ─
// Ver src/core/ports/llm.ts (humanizarResposta) — a resposta já está
// correta e aprovada (ou é uma mensagem fixa segura); a única tarefa aqui
// é reescrevê-la, nunca completá-la ou corrigi-la com conhecimento
// próprio. Complementa gerarResposta (PROMPT_SISTEMA acima) — essa gera
// texto novo mas fundamentado no contexto da KB; esta só reescreve texto
// já pronto, sem gerar nada de novo (ver core/services/chatService.ts).

export const PROMPT_SISTEMA_HUMANIZACAO = `Reescreves respostas de apoio ao cliente da Vértice Digital para soarem mais naturais e
humanas, dirigidas à pergunta concreta que foi feita. Respondes em português de Portugal.

Regras importantes:
- O "conteúdo base" já está correto e aprovado — a tua única tarefa é reescrevê-lo para se
  ler como uma resposta pessoal àquela pergunta, não como um artigo genérico colado sem
  contexto.
- Não acrescentes nenhum facto, prazo, valor ou instrução que não esteja no conteúdo base, e
  não removas nenhum dos que lá estão.
- Não inventes procedimentos, prazos ou valores que não constem do conteúdo base.
- Se o conteúdo base tiver uma lista de passos, mantém-na como lista.
- Mantém a resposta concisa — reescrever não é alongar.
- Devolve só a resposta final, sem comentários sobre o que fizeste.`;

export function construirPromptUtilizadorHumanizacao(pedido: PedidoHumanizacaoResposta): string {
  return `Cliente: ${pedido.nomeEmpresa ?? "desconhecido"}

Pergunta do cliente:
${pedido.pergunta}

Conteúdo base a reescrever (factualmente correto, só precisa de soar mais natural para esta pergunta):
${pedido.respostaBase}`;
}
