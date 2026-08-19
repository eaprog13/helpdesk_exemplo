import { NextResponse } from "next/server";
import { z } from "zod";
import { ErroAutenticacao, exigirPapel } from "@/lib/auth/session";
import { comCors, respostaPreflightCors } from "@/lib/security/cors";
import { apagarEntradaBaseConhecimento, atualizarEntradaBaseConhecimento } from "@/core/services/knowledgeBaseService";

export const runtime = "nodejs";

export async function OPTIONS(pedido: Request) {
  return respostaPreflightCors(pedido);
}

const esquemaAlteracoes = z.object({
  titulo: z.string().min(3).max(200).optional(),
  conteudo: z.string().min(10).max(8000).optional(),
  tipoSite: z.enum(["institutional", "ecommerce", "both"]).optional(),
  etiquetas: z.array(z.string().min(1).max(40)).max(10).optional(),
  publicado: z.boolean().optional(),
});

export async function PATCH(pedido: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { dependencias } = await exigirPapel(["admin", "dev"]);
    const corpo = await pedido.json();
    const dadosValidados = esquemaAlteracoes.safeParse(corpo);
    if (!dadosValidados.success) {
      return comCors(
        pedido,
        NextResponse.json({ error: dadosValidados.error.errors[0]?.message }, { status: 400 })
      );
    }

    const entrada = await atualizarEntradaBaseConhecimento(dependencias, id, dadosValidados.data);
    if (!entrada) {
      return comCors(pedido, NextResponse.json({ error: "Entrada não encontrada." }, { status: 404 }));
    }
    return comCors(pedido, NextResponse.json({ entrada }, { status: 200 }));
  } catch (erro) {
    if (erro instanceof ErroAutenticacao) {
      return comCors(pedido, NextResponse.json({ error: erro.message }, { status: erro.estado }));
    }
    console.error("[/api/admin/knowledge-base/:id PATCH] erro:", erro);
    return comCors(pedido, NextResponse.json({ error: "Erro ao atualizar entrada." }, { status: 500 }));
  }
}

export async function DELETE(pedido: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { dependencias } = await exigirPapel(["admin"]);
    await apagarEntradaBaseConhecimento(dependencias, id);
    return comCors(pedido, NextResponse.json({ ok: true }, { status: 200 }));
  } catch (erro) {
    if (erro instanceof ErroAutenticacao) {
      return comCors(pedido, NextResponse.json({ error: erro.message }, { status: erro.estado }));
    }
    console.error("[/api/admin/knowledge-base/:id DELETE] erro:", erro);
    return comCors(pedido, NextResponse.json({ error: "Erro ao remover entrada." }, { status: 500 }));
  }
}
