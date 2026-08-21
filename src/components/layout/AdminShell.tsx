"use client";

import { useState, type ReactNode } from "react";
import { BarraLateral } from "@/components/layout/Sidebar";
import { Cabecalho } from "@/components/layout/Header";
import type { Departamento } from "@/core/types";

interface ItemNavegacao {
  href: string;
  rotulo: string;
}

/**
 * Componente cliente só para guardar "a sidebar está aberta?" — precisa de
 * viver acima de BarraLateral e Cabecalho ao mesmo tempo (o botão
 * hamburguer fica no Cabecalho, o drawer é a BarraLateral) e
 * admin/layout.tsx é um Server Component, que não pode ter useState. Toda
 * a lógica de cada peça continua nos próprios componentes; isto só liga o
 * fio entre os dois.
 */
export function AdminShell({
  itens,
  rotuloMarca,
  papel,
  departamentos,
  nomeCompleto,
  nomeEmpresa,
  children,
}: {
  itens: ItemNavegacao[];
  rotuloMarca: string;
  papel?: "admin" | "dev";
  departamentos?: Departamento[];
  nomeCompleto: string;
  nomeEmpresa: string;
  children: ReactNode;
}) {
  const [sidebarAberta, setSidebarAberta] = useState(false);

  return (
    <div className="flex h-screen bg-surface">
      <BarraLateral
        itens={itens}
        rotuloMarca={rotuloMarca}
        papel={papel}
        departamentos={departamentos}
        aberta={sidebarAberta}
        aoFechar={() => setSidebarAberta(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Cabecalho
          nomeCompleto={nomeCompleto}
          nomeEmpresa={nomeEmpresa}
          aoAlternarMenuLateral={() => setSidebarAberta((aberta) => !aberta)}
        />
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
