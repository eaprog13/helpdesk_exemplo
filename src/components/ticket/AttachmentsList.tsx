"use client";

import { useRef, useState } from "react";
import { Botao } from "@/components/ui/Button";
import type { AnexoTicketComUrl } from "@/core/types";

const TIPOS_ACEITES = "image/png,image/jpeg,image/webp,application/pdf";

/**
 * Lista de anexos de um ticket + upload de novos. Usado tanto no aviso de
 * "ticket criado" no chat como nas páginas de detalhe (cliente e admin) —
 * um só sítio a saber falar com POST /api/tickets/:id/attachments, para
 * não repetir a mesma lógica em três componentes diferentes.
 */
export function ListaAnexosTicket({
  idTicket,
  anexosIniciais,
  legenda,
  podeAnexar = true,
}: {
  idTicket: string;
  anexosIniciais: AnexoTicketComUrl[];
  legenda?: string;
  /**
   * Esconde só o controlo de upload — a lista de anexos já existentes
   * mantém-se sempre visível. false enquanto o pedido está "em resolução"
   * (aguarda resposta) ou "fechado" — ver core/services/ticketService.ts,
   * adicionarAnexoTicket, que aplica a mesma regra do lado do servidor
   * (isto é só para a interface não prometer o que a API depois recusa).
   */
  podeAnexar?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [anexos, setAnexos] = useState(anexosIniciais);
  const [aCarregar, setACarregar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function aoEscolherFicheiro(evento: React.ChangeEvent<HTMLInputElement>) {
    const ficheiro = evento.target.files?.[0];
    if (!ficheiro) return;

    setACarregar(true);
    setErro(null);

    const dados = new FormData();
    dados.append("ficheiro", ficheiro);

    const resposta = await fetch(`/api/tickets/${idTicket}/attachments`, { method: "POST", body: dados });
    const corpo = await resposta.json();
    setACarregar(false);
    evento.target.value = ""; // permite voltar a escolher o mesmo ficheiro, se necessário

    if (!resposta.ok) {
      setErro(corpo.error ?? "Não foi possível anexar o ficheiro.");
      return;
    }
    setAnexos((anteriores) => [...anteriores, corpo.anexo]);
  }

  return (
    <div>
      {legenda && <p className="text-xs text-ink-400">{legenda}</p>}

      {anexos.length > 0 && (
        <ul className="mt-1.5 space-y-1">
          {anexos.map((anexo) => (
            <li key={anexo.id}>
              <a
                href={anexo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent-hover underline decoration-accent/40 underline-offset-2 hover:decoration-accent-hover"
              >
                📎 {anexo.file_name}
              </a>
            </li>
          ))}
        </ul>
      )}

      {podeAnexar && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={TIPOS_ACEITES}
            className="hidden"
            onChange={aoEscolherFicheiro}
          />
          <Botao
            type="button"
            variant="secondary"
            size="sm"
            className="mt-2"
            isLoading={aCarregar}
            onClick={() => inputRef.current?.click()}
          >
            {anexos.length > 0 ? "Anexar outro ficheiro" : "Anexar ficheiro"}
          </Botao>
        </>
      )}
      {erro && <p className="mt-1.5 text-xs text-danger">{erro}</p>}
    </div>
  );
}
