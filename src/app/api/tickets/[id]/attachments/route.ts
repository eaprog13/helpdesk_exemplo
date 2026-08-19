import { NextResponse } from "next/server";
import { ErroAutenticacao, exigirUtilizador } from "@/lib/auth/session";
import { comCors, respostaPreflightCors } from "@/lib/security/cors";
import {
  ErroAcessoNegado,
  ErroNaoEncontrado,
  TipoAnexoInvalidoError,
  adicionarAnexoTicket,
} from "@/core/services/ticketService";

export const runtime = "nodejs";

export async function OPTIONS(pedido: Request) {
  return respostaPreflightCors(pedido);
}

/**
 * POST /api/tickets/:id/attachments — cliente dono do ticket, ou staff.
 * Recebe multipart/form-data com um campo "ficheiro" (imagem ou PDF).
 */
export async function POST(pedido: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { utilizador, perfil, dependencias } = await exigirUtilizador();

    const formulario = await pedido.formData();
    const ficheiro = formulario.get("ficheiro");
    if (!(ficheiro instanceof File)) {
      return comCors(pedido, NextResponse.json({ error: "Nenhum ficheiro enviado." }, { status: 400 }));
    }

    const conteudo = Buffer.from(await ficheiro.arrayBuffer());
    const anexo = await adicionarAnexoTicket(dependencias, utilizador, perfil, {
      idTicket: id,
      nomeFicheiro: ficheiro.name,
      conteudo,
      tipoConteudo: ficheiro.type,
    });

    return comCors(pedido, NextResponse.json({ anexo }, { status: 201 }));
  } catch (erro) {
    if (erro instanceof ErroAutenticacao) {
      return comCors(pedido, NextResponse.json({ error: erro.message }, { status: erro.estado }));
    }
    if (erro instanceof ErroNaoEncontrado) {
      return comCors(pedido, NextResponse.json({ error: erro.message }, { status: 404 }));
    }
    if (erro instanceof ErroAcessoNegado) {
      return comCors(pedido, NextResponse.json({ error: erro.message }, { status: 403 }));
    }
    if (erro instanceof TipoAnexoInvalidoError) {
      return comCors(pedido, NextResponse.json({ error: erro.message }, { status: 400 }));
    }
    console.error("[/api/tickets/:id/attachments POST] erro:", erro);
    return comCors(pedido, NextResponse.json({ error: "Erro ao carregar o anexo." }, { status: 500 }));
  }
}
