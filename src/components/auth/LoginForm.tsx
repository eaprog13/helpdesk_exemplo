"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { criarClienteSupabase } from "@/lib/supabase/client";
import { Botao } from "@/components/ui/Button";
import { Campo } from "@/components/ui/Input";
import { Cartao } from "@/components/ui/Card";

export function FormularioLogin() {
  const router = useRouter();
  const parametrosPesquisa = useSearchParams();
  const [email, setEmail] = useState("");
  const [palavraPasse, setPalavraPasse] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aCarregar, setACarregar] = useState(false);

  async function submeter(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setACarregar(true);

    const supabase = criarClienteSupabase();
    const { error: erroLogin } = await supabase.auth.signInWithPassword({ email, password: palavraPasse });

    if (erroLogin) {
      // Detalhe completo só na consola (nunca no ecrã, para não revelar a
      // utilizadores mal-intencionados se um email existe ou não) — mas é
      // exatamente o que precisamos para diagnosticar durante o desenvolvimento.
      console.error("[login] Supabase respondeu com erro:", erroLogin.status, erroLogin.message);

      if (erroLogin.message?.toLowerCase().includes("email not confirmed")) {
        setErro("O email ainda não está confirmado no Supabase (Authentication → Users → confirmar manualmente).");
      } else {
        setErro("Email ou password incorretos. Verifique as credenciais recebidas por email.");
      }
      setACarregar(false);
      return;
    }

    // Cada login arranca com uma conversa em branco — as anteriores não se
    // perdem, ficam acessíveis em "Histórico". Não bloqueia o login se
    // falhar (ex.: hiccup de rede): a página de chat continua a funcionar,
    // só reaproveita a conversa mais recente em vez de criar uma nova.
    try {
      await fetch("/api/chat/conversas", { method: "POST" });
    } catch (erroConversa) {
      console.error("[login] não foi possível iniciar nova conversa:", erroConversa);
    }

    const redirecionarPara = parametrosPesquisa.get("redirectTo") ?? "/";
    router.replace(redirecionarPara);
    router.refresh();
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
          <div>
            <label htmlFor="palavraPasse" className="mb-1.5 block text-sm font-medium text-ink">
              Password
            </label>
            <Campo
              id="palavraPasse"
              type="password"
              autoComplete="current-password"
              required
              value={palavraPasse}
              onChange={(e) => setPalavraPasse(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {erro && (
            <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {erro}
            </p>
          )}

          <Botao type="submit" isLoading={aCarregar} className="w-full">
            Entrar
          </Botao>
        </form>
      </Cartao>

      <p className="mt-6 text-center text-xs text-ink-300">
        Ainda não tem acesso? Contacte a equipa da Vértice para lhe ser criada uma conta.
      </p>
    </>
  );
}
