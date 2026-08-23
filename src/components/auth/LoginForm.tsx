"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { login, type ActionState } from "@/app/login/actions";
import { Botao } from "@/components/ui/Button";
import { Campo } from "@/components/ui/Input";
import { CampoPassword } from "@/components/ui/PasswordInput";
import { Cartao } from "@/components/ui/Card";

const initialState: ActionState = { status: "idle" };

function BotaoSubmeter() {
  const { pending } = useFormStatus();
  return (
    <Botao type="submit" isLoading={pending} className="w-full">
      Entrar
    </Botao>
  );
}

export function FormularioLogin({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction] = useActionState(login, initialState);

  return (
    <>
      <Cartao className="animate-entrada p-6">
        <form action={formAction} className="space-y-4">
          {redirectTo ? <input type="hidden" name="redirectTo" value={redirectTo} /> : null}

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">
              Email
            </label>
            <Campo id="email" name="email" type="email" autoComplete="email" required placeholder="nome@empresa.pt" />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="palavraPasse" className="block text-sm font-medium text-ink">
                Password
              </label>
              <Link href="/forgot-password" className="text-xs text-accent-hover underline">
                Esqueceu-se da password?
              </Link>
            </div>
            <CampoPassword
              id="palavraPasse"
              name="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
            />
          </div>

          {state.status === "error" ? (
            <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {state.message}
            </p>
          ) : null}

          <BotaoSubmeter />
        </form>
      </Cartao>

      <p className="mt-6 text-center text-xs text-ink-300">
        Ainda não tem acesso? Contacte a equipa da Vértice Digital em{" "}
        <a href="mailto:geral@vertice-digital.example" className="text-accent-hover underline">
          geral@vertice-digital.example
        </a>{" "}
        para lhe ser criada uma conta.
      </p>
    </>
  );
}
