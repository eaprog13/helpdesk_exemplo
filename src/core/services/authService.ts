import type { Dependencias } from "@/core/deps";

/** Define uma nova password para o próprio utilizador (fluxo de 1º acesso). */
export async function alterarPalavraPasse(dependencias: Dependencias, idUtilizador: string, novaPalavraPasse: string) {
  await dependencias.identidade.definirPalavraPasse(idUtilizador, novaPalavraPasse);
  await dependencias.perfis.atualizar(idUtilizador, { must_change_password: false });
}
