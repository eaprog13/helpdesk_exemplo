import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente Supabase para uso no servidor (Server Components, Route Handlers,
 * Server Actions). Lê/escreve a sessão a partir dos cookies HTTP-only geridos
 * pelo Supabase Auth — o JWT de sessão nunca fica acessível a JavaScript no
 * browser (mitiga roubo de token via XSS).
 */
export async function criarClienteServidor() {
  const armazemCookies = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(nome: string) {
          return armazemCookies.get(nome)?.value;
        },
        set(nome: string, valor: string, opcoes: CookieOptions) {
          try {
            armazemCookies.set({ name: nome, value: valor, ...opcoes });
          } catch {
            // set() chamado a partir de um Server Component: ignorável,
            // o middleware trata da renovação de sessão nesse caso.
          }
        },
        remove(nome: string, opcoes: CookieOptions) {
          try {
            armazemCookies.set({ name: nome, value: "", ...opcoes });
          } catch {
            // idem
          }
        },
      },
    }
  );
}
