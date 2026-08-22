import { Suspense } from "react";
import { connection } from "next/server";
import { FormularioLogin } from "@/components/auth/LoginForm";

export default async function PaginaLogin() {
  // Força renderização dinâmica (por pedido): o CSP em middleware.ts usa um
  // nonce novo a cada pedido, e o Next só consegue aplicá-lo aos scripts que
  // gera quando a página é renderizada dinamicamente — pré-gerada em build
  // não tem pedido/nonce nenhum disponível, e os scripts ficavam bloqueados
  // pelo próprio CSP (ver comentário em middleware.ts).
  await connection();

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- ficheiro estático servido a partir de public/logo.png */}
          <img src="/logo.png" alt="Vértice Digital" className="mx-auto mb-4 h-auto w-full max-w-[260px] object-contain" />
          <h1 className="text-xl font-semibold text-ink">Apoio ao Cliente</h1>
          <p className="mt-1 text-sm text-ink-400">
            Inicie sessão com as credenciais que recebeu por email.
          </p>
        </div>

        <Suspense fallback={<div className="h-56" />}>
          <FormularioLogin />
        </Suspense>
      </div>
    </main>
  );
}
