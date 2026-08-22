import { connection } from "next/server";
import { FormularioAlterarPassword } from "@/components/auth/ChangePasswordForm";

export default async function PaginaAlterarPalavraPasse() {
  // Ver comentário equivalente em src/app/login/page.tsx: força renderização
  // dinâmica para que o nonce do CSP (middleware.ts) chegue aos scripts
  // desta página. Página dividida em servidor (aqui) + cliente
  // (ChangePasswordForm.tsx) porque "use client" na própria página impede
  // usar connection(), que só corre em Server Components.
  await connection();

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold text-ink">Alterar password</h1>
          {/* Frase neutra de propósito — esta página serve tanto o 1º
              acesso obrigatório (ver "app"/layout.tsx e admin/layout.tsx,
              must_change_password) como uma alteração voluntária feita
              mais tarde a partir do menu ("Terminar sessão"/"Alterar
              password" no Cabecalho). */}
          <p className="mt-1 text-sm text-ink-400">Escolha uma password forte para a sua conta.</p>
        </div>

        <FormularioAlterarPassword />
      </div>
    </main>
  );
}
