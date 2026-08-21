-- Migração: contador de reaberturas por ticket (reopened_count). Gerado a
-- 2026-08-20, para o dashboard de estatísticas em /admin/dashboard poder
-- calcular uma taxa de reabertura — proxy de satisfação do cliente, na
-- ausência de uma classificação real (1-5 estrelas ou semelhante).
--
-- Nota: "resolved_at" NÃO serve para isto — é apagado (volta a null)
-- sempre que o cliente reabre um ticket (ver responderClienteTicket em
-- core/services/ticketService.ts), por isso um ticket reaberto 3 vezes e
-- agora "em curso" fica indistinguível de um que nunca foi resolvido. Este
-- contador nunca é apagado, só incrementado — sobrevive a qualquer
-- número de ciclos resolvido→reaberto.
--
-- Como aplicar: colar no SQL Editor do Supabase, ou
--   psql "$DATABASE_URL" -f supabase/migration_contador_reaberturas.sql

alter table public.tickets
  add column if not exists reopened_count integer not null default 0;

alter table public.tickets
  drop constraint if exists tickets_reopened_count_check;
alter table public.tickets
  add constraint tickets_reopened_count_check check (reopened_count >= 0);
