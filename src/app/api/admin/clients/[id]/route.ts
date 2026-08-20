import { NextResponse } from "next/server";
import { z } from "zod";
import { ErroAutenticacao, exigirPapel } from "@/lib/auth/session";
import { comCors, respostaPreflightCors } from "@/lib/security/cors";
import { ErroNaoEncontrado } from "@/core/services/chatService";
import { atualizarDepartamentosCliente, atualizarServicosCliente } from "@/core/services/clientService";
import type { Perfil } from "@/core/types";

export const runtime = "nodejs";

export async function OPTIONS(pedido: Request) {
  return respostaPreflightCors(pedido);
}

const esquemaAlteracoes = z
  .object({
    // Organização interna do admin — pode ficar vazio.
    departamentos: z.array(z.enum(["desenvolvimento", "marketing", "design", "geral"])).max(4).optional(),
    // Serviço(s) contratados — nunca pode ficar vazio (ver Perfil.site_type em core/types.ts).
    tiposSite: z
      .array(z.enum(["institutional", "ecommerce", "web_app", "mobile_app", "other"]))
      .min(1, "Escolha pelo menos um serviço.")
      .max(5)
      .optional(),
  })
  .refine((d) => d.departamentos !== undefined || d.tiposSite !== undefined, {
    message: "Nada para atualizar.",
  });

/**
 * PATCH /api/admin/clients/:id — apenas 'admin'. Corrige o departamento
 * (organização interna) e/ou o(s) serviço(s) (site_type) de um cliente já
 * existente — a criação só permitia defini-los uma vez (ver
 * clientService.ts, atualizarDepartamentosCliente/atualizarServicosCliente).
 */
export async function PATCH(pedido: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { dependencias } = await exigirPapel(["admin"]);

    const corpo = await pedido.json();
    const dadosValidados = esquemaAlteracoes.safeParse(corpo);
    if (!dadosValidados.success) {
      return comCors(
        pedido,
        NextResponse.json({ error: dadosValidados.error.errors[0]?.message }, { status: 400 })
      );
    }

    let cliente: Perfil | null = null;
    if (dadosValidados.data.departamentos !== undefined) {
      cliente = await atualizarDepartamentosCliente(dependencias, id, dadosValidados.data.departamentos);
    }
    if (dadosValidados.data.tiposSite !== undefined) {
      cliente = await atualizarServicosCliente(dependencias, id, dadosValidados.data.tiposSite);
    }

    return comCors(pedido, NextResponse.json({ cliente }, { status: 200 }));
  } catch (erro) {
    if (erro instanceof ErroAutenticacao) {
      return comCors(pedido, NextResponse.json({ error: erro.message }, { status: erro.estado }));
    }
    if (erro instanceof ErroNaoEncontrado) {
      return comCors(pedido, NextResponse.json({ error: erro.message }, { status: 404 }));
    }
    console.error("[/api/admin/clients/:id PATCH] erro:", erro);
    return comCors(pedido, NextResponse.json({ error: "Erro ao atualizar o cliente." }, { status: 500 }));
  }
}
