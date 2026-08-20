"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { criarClienteSupabase } from "@/lib/supabase/client";
import { Botao } from "@/components/ui/Button";
import { Campo } from "@/components/ui/Input";
import { Cartao } from "@/components/ui/Card";

export function FormularioRecuperarPassword() {
  const parametrosPesquisa = useSearchParams();
  const linkInvalido = parametrosPesquisa.get("erro") === "link_invalido";

  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [aCarregar, setACarregar] = useState(false);

  async function submeter(evento: FormEvent) {
    evento.preventDefault();
    setACarregar(true);

    const supabase = criarClienteSupabase();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/api/auth/callback`,
    });

    // Mostra sempre a mesma mensagem de sucesso, quer o email exista ou não
    // como conta — tal como no login (ver LoginForm.tsx), revelar isso a
    // quem não conhece as credenciais seria dar-lhe informação para tentar
    // adivinhar contas válidas. O erro real (se algum) fica só na consola.
    if (error) {
      console.error("[recuperar password] Supabase respondeu com erro:", error.status, error.message);
    }

    setACarregar(false);
    setEnviado(true);
  }

  if (enviado) {
    return (
      <Cartao className="animate-entrada p-6 text-center">
        <p className="text-sm text-ink">
          Se existir uma conta com o email <strong>{email}</strong>, vai receber uma mensagem com um
          link para repor a password.
        </p>
        <p className="mt-3 text-xs text-ink-300">
          Não recebeu nada em alguns minutos? Verifique o spam ou tente novamente.
        </p>
        <Link href="/login" className="mt-4 inline-block text-sm text-accent-hover underline">
          Voltar ao login
        </Link>
      </Cartao>
    );
  }

  return (
    <>
      <Cartao className="animate-entrada p-6">
        <form onSubmit={submeter} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">
              Email
            </label>
            <Campo
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@empresa.pt"
            />
          </div>

          {linkInvalido && (
            <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              Esse link de recuperação já não é válido ou expirou. Peça um novo abaixo.
            </p>
          )}

          <Botao type="submit" isLoading={aCarregar} className="w-full">
            Enviar link de recuperação
          </Botao>
        </form>
      </Cartao>

      <p className="mt-6 text-center text-xs text-ink-300">
        <Link href="/login" className="text-accent-hover underline">
          Voltar ao login
        </Link>
      </p>
    </>
  );
}
