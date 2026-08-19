import type { PedidoRespostaLlm } from "@/core/ports/llm";

// Prompt partilhado por todos os adaptadores de LLM (Anthropic/OpenAI/Gemini)
// para garantir que o comportamento não muda ao trocar de fornecedor.

export const PROMPT_SISTEMA = `És o assistente de apoio ao cliente da Vértice Digital, uma empresa que desenvolve e mantém
sites institucionais e lojas online para os seus clientes. Respondes em português de Portugal,
de forma clara, curta e profissional.

Regras importantes:
- Usa o contexto interno fornecido (se existir) como fonte prioritária de verdade.
- Se o contexto não cobrir a pergunta, responde com o teu melhor conhecimento geral sobre
  gestão de sites institucionais e lojas online, deixando claro quando é uma sugestão geral
  e não um procedimento oficial da Vértice.
- Nunca inventes procedimentos internos específicos da Vértice Digital (URLs, painéis, prazos) que não
  estejam no contexto fornecido.
- Sê conciso: preferes respostas de poucos parágrafos ou uma lista de passos.
- Termina sempre a informar que, por segurança, um colaborador humano vai rever este caso.`;

export function construirPromptUtilizador(pedido: PedidoRespostaLlm): string {
  const blocoContexto =
    pedido.contextoRelacionado.length > 0
      ? pedido.contextoRelacionado
          .map((c, i) => `[Contexto ${i + 1} — ${c.titulo}]\n${c.conteudo}`)
          .join("\n\n")
      : "(sem contexto interno relacionado encontrado)";

  return `Cliente: ${pedido.nomeEmpresa ?? "desconhecido"} (tipo de site: ${
    pedido.tipoSite ?? "não especificado"
  })

Contexto interno relacionado:
${blocoContexto}

Pergunta do cliente:
${pedido.pergunta}`;
}
