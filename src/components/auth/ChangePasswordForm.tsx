"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Botao } from "@/components/ui/Button";
import { CampoPassword } from "@/components/ui/PasswordInput";
import { Cartao } from "@/components/ui/Card";

export function FormularioAlterarPassword() {
  const router = useRouter();
  const [novaPalavraPasse, setNovaPalavraPasse] = useState("");
  const [confirmarPalavraPasse, setConfirmarPalavraPasse] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aCarregar, setACarregar] = useState(false);

  async function submeter(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);

    if (novaPalavraPasse !== confirmarPalavraPasse) {
      setErro("As passwords não coincidem.");
      return;
    }

    setACarregar(true);
    const resposta = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ novaPalavraPasse }),
    });
    const corpo = await resposta.json();
    setACarregar(false);

    if (!resposta.ok) {
      setErro(corpo.error ?? "Não foi possível alterar a password.");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <Cartao className="p-6">
      <form onSubmit={submeter} className="space-y-4">
        <div>
          <label htmlFor="novaPalavraPasse" className="mb-1.5 block text-sm font-medium text-ink">
            Nova password
          </label>
          <CampoPassword
            id="novaPalavraPasse"
            autoComplete="new-password"
            required
            minLength={10}
            value={novaPalavraPasse}
            onChange={(e) => setNovaPalavraPasse(e.target.value)}
          />
          <p className="mt-1 text-xs text-ink-300">
            Mínimo 10 caracteres, com maiúsculas, minúsculas e números.
          </p>
        </div>
        <div>
          <label htmlFor="confirmarPalavraPasse" className="mb-1.5 block text-sm font-medium text-ink">
            Confirmar password
          </label>
          <CampoPassword
            id="confirmarPalavraPasse"
            autoComplete="new-password"
            required
            minLength={10}
            value={confirmarPalavraPasse}
            onChange={(e) => setConfirmarPalavraPasse(e.target.value)}
          />
        </div>

        {erro && (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {erro}
          </p>
        )}

        <Botao type="submit" isLoading={aCarregar} className="w-full">
          Guardar e continuar
        </Botao>
      </form>
    </Cartao>
  );
}
