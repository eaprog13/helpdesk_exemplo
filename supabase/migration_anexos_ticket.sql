-- ════════════════════════════════════════════════════════════════════════
-- Migração: anexos de ticket (capturas de ecrã para ajudar o dev)
-- Gerado a 2026-08-19.
--
-- Acrescenta a tabela public.ticket_attachments e o bucket privado
-- "ticket-attachments" no Storage, para o cliente poder anexar uma
-- captura de ecrã (ou PDF) logo quando um ticket é aberto no chat, ou mais
-- tarde a partir do detalhe do pedido. schema.sql/policies.sql já incluem
-- esta migração para instalações novas — só é preciso correr este ficheiro
-- em instalações que já existiam antes desta versão.
--
-- Como aplicar: colar no SQL Editor do Supabase e correr. Idempotente
-- (seguro correr mais do que uma vez).
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.ticket_attachments (
  id           uuid primary key default gen_random_uuid(),
  ticket_id    uuid not null references public.tickets (id) on delete cascade,
  uploaded_by  uuid not null references public.profiles (id),
  file_path    text not null,
  file_name    text not null,
  content_type text not null,
  size_bytes   integer not null,
  created_at   timestamptz not null default now()
);

create index if not exists ticket_attachments_ticket_idx on public.ticket_attachments (ticket_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ticket-attachments', 'ticket-attachments', false, 5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.ticket_attachments enable row level security;

drop policy if exists "ticket_attachments: cliente vê anexos dos seus tickets" on public.ticket_attachments;
create policy "ticket_attachments: cliente vê anexos dos seus tickets"
  on public.ticket_attachments for select
  using (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_id and t.client_id = auth.uid()
    )
  );

drop policy if exists "ticket_attachments: cliente anexa aos seus tickets" on public.ticket_attachments;
create policy "ticket_attachments: cliente anexa aos seus tickets"
  on public.ticket_attachments for insert
  with check (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_id and t.client_id = auth.uid()
    )
  );

drop policy if exists "ticket_attachments: staff vê e gere todos" on public.ticket_attachments;
create policy "ticket_attachments: staff vê e gere todos"
  on public.ticket_attachments for all
  using (public.current_role_is(array['admin', 'dev']))
  with check (public.current_role_is(array['admin', 'dev']));

drop policy if exists "ticket-attachments: staff gere os ficheiros" on storage.objects;
create policy "ticket-attachments: staff gere os ficheiros"
  on storage.objects for all
  using (bucket_id = 'ticket-attachments' and public.current_role_is(array['admin', 'dev']))
  with check (bucket_id = 'ticket-attachments' and public.current_role_is(array['admin', 'dev']));
