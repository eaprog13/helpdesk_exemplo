import { Suspense } from "react";
import { FormularioLogin } from "@/components/auth/LoginForm";

export default function PaginaLogin() {
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
