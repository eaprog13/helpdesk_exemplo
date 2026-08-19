import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";
import { obterContentor } from "@/composition/container";
import type { UtilizadorAutenticado, PapelUtilizador } from "@/core/types";

/**
 * Camada web (Next.js): resolve quem está autenticado no pedido HTTP atual.
 *
 * Esta é, deliberadamente, a única parte do fluxo de autenticação que
 * conhece "cookies" e "pedido HTTP" — depende do Next.js porque QUALQUER
 * framework web precisa de uma forma de ler a sessão do pedido, e essa
 * forma é sempre específica do framework/transporte escolhido. Ao trocar
 * de framework, só este ficheiro (e o equivalente em src/lib/supabase) é
 * reescrito; toda a lógica de negócio (core/services) fica intacta porque
 * só recebe um UtilizadorAutenticado + Perfil já resolvidos.
 */

export class ErroAutenticacao extends Error {
  estado: number;
  constructor(mensagem: string, estado = 401) {
    super(mensagem);
    this.estado = estado;
  }
}

export async function exigirUtilizador() {
  const supabase = await criarClienteServidor();
  const {
    data: { user: utilizadorSupabase },
    error: erro,
  } = await supabase.auth.getUser();

  if (erro || !utilizadorSupabase || !utilizadorSupabase.email) {
    throw new ErroAutenticacao("Sessão inválida ou expirada. Inicie sessão novamente.", 401);
  }

  const dependencias = obterContentor();
  const perfil = await dependencias.perfis.obterPorId(utilizadorSupabase.id);
  if (!perfil) {
    throw new ErroAutenticacao("Perfil de utilizador não encontrado.", 401);
  }

  const utilizador: UtilizadorAutenticado = { id: utilizadorSupabase.id, email: utilizadorSupabase.email };
  return { utilizador, perfil, dependencias };
}

export async function exigirPapel(papeis: PapelUtilizador[]) {
  const contexto = await exigirUtilizador();
  if (!papeis.includes(contexto.perfil.role)) {
    throw new ErroAutenticacao("Não tem permissões para aceder a este recurso.", 403);
  }
  return contexto;
}
