import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DadosCriacaoUtilizador, FornecedorGestaoIdentidade } from "@/core/ports/identity";

/**
 * Implementa a gestão de identidade sobre o Supabase Auth (Admin API).
 * Para trocar de fornecedor de identidade (Auth0, Clerk, Cognito, um
 * sistema próprio…), basta escrever uma nova classe que implemente
 * FornecedorGestaoIdentidade e ligá-la em src/composition/container.ts.
 */
export class FornecedorGestaoIdentidadeSupabase implements FornecedorGestaoIdentidade {
  constructor(private readonly authAdmin: SupabaseClient["auth"]["admin"]) {}

  async criarUtilizador(dados: DadosCriacaoUtilizador): Promise<{ id: string }> {
    const { data, error } = await this.authAdmin.createUser({
      email: dados.email,
      password: dados.palavraPasse,
      email_confirm: true,
      user_metadata: dados.metadados,
    });
    if (error || !data.user) {
      throw new Error(error?.message ?? "Não foi possível criar o utilizador.");
    }
    return { id: data.user.id };
  }

  async definirPalavraPasse(idUtilizador: string, novaPalavraPasse: string): Promise<void> {
    const { error } = await this.authAdmin.updateUserById(idUtilizador, { password: novaPalavraPasse });
    if (error) throw new Error(error.message);
  }

  async obterEmailPorId(idUtilizador: string): Promise<string | null> {
    const { data, error } = await this.authAdmin.getUserById(idUtilizador);
    if (error) return null;
    return data.user?.email ?? null;
  }
}
