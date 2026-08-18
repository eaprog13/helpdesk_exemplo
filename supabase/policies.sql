-- ════════════════════════════════════════════════════════════════════════
-- Row Level Security — segunda linha de defesa a nível da base de dados,
-- independente da validação já feita nas rotas da API (defense in depth).
-- ════════════════════════════════════════════════════════════════════════

alter table public.profiles          enable row level security;
alter table public.knowledge_base    enable row level security;
alter table public.conversations     enable row level security;
alter table public.messages          enable row level security;
alter table public.tickets           enable row level security;
alter table public.ticket_updates    enable row level security;
alter table public.notifications_log enable row level security;

-- Função auxiliar: papel do utilizador autenticado
create or replace function public.current_role_is(roles text[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = any(roles)
  );
$$;

-- ── profiles ────────────────────────────────────────────────────────────
create policy "profiles: utilizador vê o próprio perfil"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles: staff vê todos os perfis"
  on public.profiles for select
  using (public.current_role_is(array['admin', 'dev']));

create policy "profiles: utilizador atualiza o próprio perfil"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles: admin gere perfis"
  on public.profiles for all
  using (public.current_role_is(array['admin']))
  with check (public.current_role_is(array['admin']));

-- ── knowledge_base ─────────────────────────────────────────────────────
create policy "kb: qualquer autenticado lê conteúdo publicado"
  on public.knowledge_base for select
  using (is_published = true or public.current_role_is(array['admin', 'dev']));

create policy "kb: staff gere a base de conhecimento"
  on public.knowledge_base for all
  using (public.current_role_is(array['admin', 'dev']))
  with check (public.current_role_is(array['admin', 'dev']));

-- ── conversations ──────────────────────────────────────────────────────
create policy "conversations: cliente vê as próprias"
  on public.conversations for select
  using (client_id = auth.uid());

create policy "conversations: cliente cria as próprias"
  on public.conversations for insert
  with check (client_id = auth.uid());

create policy "conversations: staff vê todas"
  on public.conversations for select
  using (public.current_role_is(array['admin', 'dev']));

-- ── messages ───────────────────────────────────────────────────────────
create policy "messages: cliente vê mensagens das suas conversas"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.client_id = auth.uid()
    )
  );

create policy "messages: cliente insere nas suas conversas"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.client_id = auth.uid()
    )
  );

create policy "messages: staff vê todas"
  on public.messages for select
  using (public.current_role_is(array['admin', 'dev']));

-- ── tickets ────────────────────────────────────────────────────────────
create policy "tickets: cliente vê os próprios"
  on public.tickets for select
  using (client_id = auth.uid());

create policy "tickets: staff vê e gere todos"
  on public.tickets for all
  using (public.current_role_is(array['admin', 'dev']))
  with check (public.current_role_is(array['admin', 'dev']));

-- ── ticket_updates ─────────────────────────────────────────────────────
create policy "ticket_updates: cliente vê apenas notas visíveis dos seus tickets"
  on public.ticket_updates for select
  using (
    visible_to_client = true
    and exists (
      select 1 from public.tickets t
      where t.id = ticket_id and t.client_id = auth.uid()
    )
  );

create policy "ticket_updates: staff vê e gere todas"
  on public.ticket_updates for all
  using (public.current_role_is(array['admin', 'dev']))
  with check (public.current_role_is(array['admin', 'dev']));

-- ── notifications_log ──────────────────────────────────────────────────
create policy "notifications_log: staff vê tudo"
  on public.notifications_log for select
  using (public.current_role_is(array['admin', 'dev']));

-- ── storage.objects (bucket "logos") ────────────────────────────────────
create policy "logos: leitura pública"
  on storage.objects for select
  using (bucket_id = 'logos');

create policy "logos: staff gere os ficheiros"
  on storage.objects for all
  using (bucket_id = 'logos' and public.current_role_is(array['admin', 'dev']))
  with check (bucket_id = 'logos' and public.current_role_is(array['admin', 'dev']));

-- Nota: as rotas de API sensíveis (criação de clientes, envio de emails/whatsapp,
-- chamadas à LLM, upload de logótipos) usam a service_role key exclusivamente
-- no servidor, que ignora RLS por definição — a validação de permissões
-- nesses casos é feita explicitamente no código da API (ver src/lib/auth/session.ts).
