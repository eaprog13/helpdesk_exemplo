import { NextResponse } from "next/server";
import { z } from "zod";
import { ErroAutenticacao, exigirPapel } from "@/lib/auth/session";
import { comCors, respostaPreflightCors } from "@/lib/security/cors";
import { verificarLimiteTaxa } from "@/lib/security/rateLimit";
import { criarCliente, listarClientes } from "@/core/services/clientService";

export const runtime = "nodejs";

export async function OPTIONS(pedido: Request) {
  return respostaPreflightCors(pedido);
}

const esquemaCriacaoCliente = z.object({
  email: z.string().email(),
  nomeCompleto: z.string().min(2).max(120),
  nomeEmpresa: z.string().min(1).max(160),
  telefone: z
    .string()
    .regex(/^\+[1-9]\d{6,14}$/, "Telefone deve estar em formato internacional E.164, ex: +351912345678")
    .optional()
    .or(z.literal("")),
  tiposSite: z
    .array(z.enum(["institutional", "ecommerce", "web_app", "mobile_app", "other"]))
    .min(1, "Escolha pelo menos um serviço.")
    .max(5),
  departamentos: z.array(z.enum(["desenvolvimento", "marketing", "design", "geral"])).max(4).default([]),
});

/**
 * POST /api/admin/clients — apenas 'admin'. Cria a conta do cliente com
 * password temporária e envia-a por email — é assim que "o cliente recebe
 * o login" antes de poder usar o chat (ver core/services/clientService.ts).
 */
export async function POST(pedido: Request) {
  try {
    const { utilizador, dependencias } = await exigirPapel(["admin"]);

    const { sucesso } = await verificarLimiteTaxa(`admin-create-client:${utilizador.id}`);
    if (!sucesso) {
      return comCors(
        pedido,
        NextResponse.json({ error: "Demasiados pedidos. Tente novamente em instantes." }, { status: 429 })
      );
    }

    const corpo = await pedido.json();
    const dadosValidados = esquemaCriacaoCliente.safeParse(corpo);
    if (!dadosValidados.success) {
      return comCors(
        pedido,
        NextResponse.json({ error: dadosValidados.error.issues[0]?.message }, { status: 400 })
      );
    }

    const cliente = await criarCliente(dependencias, {
      email: dadosValidados.data.email,
      nomeCompleto: dadosValidados.data.nomeCompleto,
      nomeEmpresa: dadosValidados.data.nomeEmpresa,
      telefone: dadosValidados.data.telefone || null,
      tiposSite: dadosValidados.data.tiposSite,
      departamentos: dadosValidados.data.departamentos,
    });

    return comCors(pedido, NextResponse.json({ cliente }, { status: 201 }));
  } catch (erro) {
    if (erro instanceof ErroAutenticacao) {
      return comCors(pedido, NextResponse.json({ error: erro.message }, { status: erro.estado }));
    }
    console.error("[/api/admin/clients POST] erro:", erro);
    return comCors(pedido, NextResponse.json({ error: "Erro ao criar o cliente." }, { status: 500 }));
  }
}

/** GET /api/admin/clients — lista clientes (admin/dev). */
export async function GET(pedido: Request) {
  try {
    const { dependencias } = await exigirPapel(["admin", "dev"]);
    const clientes = await listarClientes(dependencias);
    return comCors(pedido, NextResponse.json({ clientes }, { status: 200 }));
  } catch (erro) {
    if (erro instanceof ErroAutenticacao) {
      return comCors(pedido, NextResponse.json({ error: erro.message }, { status: erro.estado }));
    }
    console.error("[/api/admin/clients GET] erro:", erro);
    return comCors(pedido, NextResponse.json({ error: "Erro ao listar clientes." }, { status: 500 }));
  }
}
