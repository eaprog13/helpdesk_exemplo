/**
 * Há quanto tempo um ticket está "por assumir" na fila do departamento —
 * mostrado em /admin/tickets?vista=fila (ver core/types.ts, Ticket) para o
 * dev perceber de relance o que está a esperar há mais tempo, sem ter de
 * comparar datas à mão. Usa `created_at` como proxy de "entrou na fila":
 * não há uma coluna própria para "ganhou departamento" — na prática
 * coincide na maioria dos casos (o cliente escolhe logo o departamento ao
 * abrir o ticket, ver abrirTicketManual em ticketService.ts; só um ticket
 * "Por atribuir" triado mais tarde por um admin é que diverge).
 */
export function formatarTempoEmFila(dataCriacaoIso: string): string {
  const minutos = Math.max(0, Math.round((Date.now() - new Date(dataCriacaoIso).getTime()) / 60_000));

  if (minutos < 1) return "em fila há instantes";
  if (minutos < 60) return `em fila há ${minutos} min`;

  const horas = Math.round(minutos / 60);
  if (horas < 24) return `em fila há ${horas}h`;

  const dias = Math.round(horas / 24);
  return `em fila há ${dias} ${dias === 1 ? "dia" : "dias"}`;
}
