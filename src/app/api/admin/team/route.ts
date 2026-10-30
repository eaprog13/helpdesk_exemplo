import { NextResponse } from "next/server";
import { z } from "zod";
import { ErroAutenticacao, exigirPapel } from "@/lib/auth/session";
import { comCors, respostaPreflightCors } from "@/lib/security/cors";
import { verificarLimiteTaxa } from "@/lib/security/rateLimit";
import { listarEquipa } from "@/core/services/ticketService";
import { criarMembroEquipa } from "@/core/services/teamService";

export const runtime = "nodejs";

export async function OPTIONS(pedido: Request) {
  return respostaPreflightCors(pedido);
}

const esquemaDepartamento = z.enum(["desenvolvimento", "marketing", "design", "geral"]);

const esquemaCriacaoMembroEquipa = z.object({
  email: z.string().email(),
  nomeCompleto: z.string().min(2).max(120),
  role: z.enum(["dev", "admin"]),
  departamentos: z.array(esquemaDepartamento).max(4).default([]),
});

/**
 * POST /api/admin/team — apenas 'admin'. Cria uma conta de equipa (dev ou
 * admin) com password temporária e envia-a por email — substitui o fluxo
 * manual de supabase/provisionar_equipa.sql (criar no painel do Supabase e
 * depois correr um UPDATE à mão).
 */
export async function POST(pedido: Request) {
  try {
    const { utilizador, dependencias } = await exigirPapel(["admin"]);

    const { sucesso } = await verificarLimiteTaxa(`admin-create-team:${utilizador.id}`);
    if (!sucesso) {
      return comCors(
        pedido,
        NextResponse.json({ error: "Demasiados pedidos. Tente novamente em instantes." }, { status: 429 })
      );
    }

    const corpo = await pedido.json();
    const dadosValidados = esquemaCriacaoMembroEquipa.safeParse(corpo);
    if (!dadosValidados.success) {
      return comCors(
        pedido,
        NextResponse.json({ error: dadosValidados.error.issues[0]?.message }, { status: 400 })
      );
    }

    const membro = await criarMembroEquipa(dependencias, dadosValidados.data);

    return comCors(pedido, NextResponse.json({ membro }, { status: 201 }));
  } catch (erro) {
    if (erro instanceof ErroAutenticacao) {
      return comCors(pedido, NextResponse.json({ error: erro.message }, { status: erro.estado }));
    }
    console.error("[/api/admin/team POST] erro:", erro);
    return comCors(pedido, NextResponse.json({ error: "Erro ao criar o membro da equipa." }, { status: 500 }));
  }
}

/**
 * GET /api/admin/team?departamento=… — apenas staff. Lista devs/admins,
 * opcionalmente filtrados por departamento — usado pelos seletores de
 * atribuição manual em /admin/tickets/:id.
 */
export async function GET(pedido: Request) {
  try {
    const { dependencias } = await exigirPapel(["admin", "dev"]);

    const url = new URL(pedido.url);
    const departamentoParam = url.searchParams.get("departamento");
    let departamento: z.infer<typeof esquemaDepartamento> | undefined;
    if (departamentoParam) {
      const validado = esquemaDepartamento.safeParse(departamentoParam);
      if (!validado.success) {
        return comCors(pedido, NextResponse.json({ error: "Departamento inválido." }, { status: 400 }));
      }
      departamento = validado.data;
    }

    const equipa = await listarEquipa(dependencias, departamento);
    return comCors(pedido, NextResponse.json({ equipa }, { status: 200 }));
  } catch (erro) {
    if (erro instanceof ErroAutenticacao) {
      return comCors(pedido, NextResponse.json({ error: erro.message }, { status: erro.estado }));
    }
    console.error("[/api/admin/team GET] erro:", erro);
    return comCors(pedido, NextResponse.json({ error: "Erro ao obter a equipa." }, { status: 500 }));
  }
}
