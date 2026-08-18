import { NextResponse } from "next/server";
import { ErroAutenticacao, exigirPapel } from "@/lib/auth/session";
import { comCors, respostaPreflightCors } from "@/lib/security/cors";
import { TipoLogoInvalidoError, atualizarLogotipoCliente } from "@/core/services/clientService";

export const runtime = "nodejs";

export async function OPTIONS(pedido: Request) {
  return respostaPreflightCors(pedido);
}

/**
 * POST /api/admin/clients/:id/logo — apenas admin/dev. Recebe multipart/form-data
 * com um campo "ficheiro" (imagem) e substitui o logótipo desse cliente.
 */
export async function POST(pedido: Request, { params }: { params: { id: string } }) {
  try {
    const { dependencias } = await exigirPapel(["admin", "dev"]);

    const formulario = await pedido.formData();
    const ficheiro = formulario.get("ficheiro");
    if (!(ficheiro instanceof File)) {
      return comCors(pedido, NextResponse.json({ error: "Nenhum ficheiro enviado." }, { status: 400 }));
    }

    const conteudo = Buffer.from(await ficheiro.arrayBuffer());
    const logoUrl = await atualizarLogotipoCliente(dependencias, params.id, {
      conteudo,
      tipoConteudo: ficheiro.type,
    });

    return comCors(pedido, NextResponse.json({ logoUrl }, { status: 200 }));
  } catch (erro) {
    if (erro instanceof ErroAutenticacao) {
      return comCors(pedido, NextResponse.json({ error: erro.message }, { status: erro.estado }));
    }
    if (erro instanceof TipoLogoInvalidoError) {
      return comCors(pedido, NextResponse.json({ error: erro.message }, { status: 400 }));
    }
    console.error("[/api/admin/clients/:id/logo POST] erro:", erro);
    return comCors(pedido, NextResponse.json({ error: "Erro ao carregar o logótipo." }, { status: 500 }));
  }
}
