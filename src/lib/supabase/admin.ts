import "server-only";
import { createClient as criarClienteBaseSupabase } from "@supabase/supabase-js";

/**
 * Cliente Supabase com a chave "service_role" — contorna Row Level Security.
 *
 * USO EXCLUSIVO NO SERVIDOR (rotas de API / Server Actions), nunca em
 * Client Components. O import "server-only" faz falhar o build caso este
 * ficheiro seja importado, ainda que indiretamente, a partir de código de
 * browser — primeira barreira contra fuga acidental da chave privada.
 */
export function criarClienteAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chaveServico = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !chaveServico) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL em falta nas variáveis de ambiente."
    );
  }

  return criarClienteBaseSupabase(url, chaveServico, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
