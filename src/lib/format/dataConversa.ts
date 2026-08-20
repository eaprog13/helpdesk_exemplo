/**
 * Título humano para uma conversa no histórico — "Hoje às 14:32", "Ontem às
 * 09:10", "Terça-feira às 16:45" (últimos 7 dias) ou a data completa. Usado
 * em vez do "subject" em bruto (ver iniciarNovaConversa em chatService.ts,
 * que já é só "Conversa de {data} às {hora}") porque repetia a mesma data
 * duas vezes no cartão — aqui é uma frase só, mais fácil de ler de relance.
 */
export function formatarTituloConversa(dataIso: string): string {
  const data = new Date(dataIso);
  const agora = new Date();

  const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const inicioDia = new Date(data.getFullYear(), data.getMonth(), data.getDate());
  const diasDeDiferenca = Math.round((inicioHoje.getTime() - inicioDia.getTime()) / 86_400_000);

  const hora = data.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });

  if (diasDeDiferenca === 0) return `Hoje às ${hora}`;
  if (diasDeDiferenca === 1) return `Ontem às ${hora}`;
  if (diasDeDiferenca > 1 && diasDeDiferenca < 7) {
    const diaSemana = data.toLocaleDateString("pt-PT", { weekday: "long" });
    return `${capitalizarPrimeiraLetra(diaSemana)} às ${hora}`;
  }
  const dataFormatada = data.toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" });
  return `${dataFormatada} às ${hora}`;
}

function capitalizarPrimeiraLetra(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
