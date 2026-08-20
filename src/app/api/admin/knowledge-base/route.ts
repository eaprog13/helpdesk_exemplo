import { NextResponse } from "next/server";
import { z } from "zod";
import { ErroAutenticacao, exigirPapel } from "@/lib/auth/session";
import { comCors, respostaPreflightCors } from "@/lib/security/cors";
import { TituloDuplicadoError, criarEntradaBaseConhecimento, listarBaseConhecimento } from "@/core/services/knowledgeBaseService";

export const runtime = "nodejs";

export async function OPTIONS(pedido: Request) {
  return respostaPreflightCors(pedido);
}

export async function GET(pedido: Request) {
  try {
    const { dependencias } = await exigirPapel(["admin", "dev"]);
    const entradas = await listarBaseConhecimento(dependencias);
    return comCors(pedido, NextResponse.json({ entradas }, { status: 200 }));
  } catch (erro) {
    if (erro instanceof ErroAutenticacao) {
      return comCors(pedido, NextResponse.json({ error: erro.message }, { status: erro.estado }));
    }
    console.error("[/api/admin/knowledge-base GET] erro:", erro);
    return comCors(pedido, NextResponse.json({ error: "Erro ao listar a base de conhecimento." }, { status: 500 }));
  }
}

const esquemaCriacao = z.object({
  titulo: z.string().min(3).max(200),
  conteudo: z.string().min(10).max(8000),
  // [] = artigo genérico, aplica-se a todos os tipos (ver TipoSite em core/types.ts).
  tipoSite: z.array(z.enum(["institutional", "ecommerce", "web_app", "mobile_app", "other"])).max(5).default([]),
  etiquetas: z.array(z.string().min(1).max(40)).max(10).default([]),
  publicado: z.boolean().default(true),
  departamento: z.enum(["desenvolvimento", "marketing", "design", "geral"]).nullable().optional(),
});

export async function POST(pedido: Request) {
  try {
    const { utilizador, perfil, dependencias } = await exigirPapel(["admin", "dev"]);
    const corpo = await pedido.json();
    const dadosValidados = esquemaCriacao.safeParse(corpo);
    if (!dadosValidados.success) {
      return comCors(
        pedido,
        NextResponse.json({ error: dadosValidados.error.errors[0]?.message }, { status: 400 })
      );
    }

    // Um dev nunca publica de imediato — o artigo entra sempre como
    // rascunho, à espera de um admin rever e publicar (ver "Publicar" em
    // KnowledgeBaseManager.tsx). Reforçado aqui, não só na UI: o valor
    // enviado pelo cliente é ignorado para quem não é admin.
    const publicado = perfil.role === "admin" ? dadosValidados.data.publicado : false;

    const entrada = await criarEntradaBaseConhecimento(dependencias, utilizador.id, {
      ...dadosValidados.data,
      publicado,
    });
    return comCors(pedido, NextResponse.json({ entrada }, { status: 201 }));
  } catch (erro) {
    if (erro instanceof ErroAutenticacao) {
      return comCors(pedido, NextResponse.json({ error: erro.message }, { status: erro.estado }));
    }
    if (erro instanceof TituloDuplicadoError) {
      return comCors(pedido, NextResponse.json({ error: erro.message }, { status: 409 }));
    }
    console.error("[/api/admin/knowledge-base POST] erro:", erro);
    return comCors(pedido, NextResponse.json({ error: "Erro ao criar entrada." }, { status: 500 }));
  }
}
