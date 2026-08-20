import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RepositorioPerfil } from "@/core/ports/repositories";
import type { Departamento, Perfil } from "@/core/types";

export class RepositorioPerfilSupabase implements RepositorioPerfil {
  constructor(private readonly bd: SupabaseClient) {}

  async obterPorId(id: string): Promise<Perfil | null> {
    const { data, error } = await this.bd.from("profiles").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`[perfis.obterPorId] ${error.message}`);
    return data;
  }

  async atualizar(id: string, alteracoes: Partial<Perfil>): Promise<void> {
    const { error } = await this.bd.from("profiles").update(alteracoes).eq("id", id);
    if (error) throw new Error(`[perfis.atualizar] ${error.message}`);
  }

  async listarClientes(): Promise<Perfil[]> {
    const { data, error } = await this.bd
      .from("profiles")
      .select("*")
      .eq("role", "client")
      .order("created_at", { ascending: false });
    if (error) throw new Error(`[perfis.listarClientes] ${error.message}`);
    return data ?? [];
  }

  async listarEquipa(departamento?: Departamento): Promise<Perfil[]> {
    let consulta = this.bd.from("profiles").select("*").in("role", ["dev", "admin"]);
    // "department" é array (uma pessoa pode cobrir mais do que um
    // departamento) — .contains() gera "department @> {departamento}",
    // ou seja, "o array inclui este valor", não uma igualdade exata.
    if (departamento) consulta = consulta.contains("department", [departamento]);
    const { data, error } = await consulta.order("full_name", { ascending: true });
    if (error) throw new Error(`[perfis.listarEquipa] ${error.message}`);
    return data ?? [];
  }
}
