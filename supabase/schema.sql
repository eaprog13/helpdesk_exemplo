-- ════════════════════════════════════════════════════════════════════════
-- Vértice · Centro de Apoio ao Cliente — Schema Supabase (Postgres)
-- Executar no SQL Editor do projeto Supabase, por esta ordem:
--   1) schema.sql
--   2) policies.sql
--   3) seed.sql   (opcional, dados de exemplo)
-- ════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── Função auxiliar: to_tsvector marcado como IMMUTABLE ────────────────
-- Necessária porque colunas geradas ("generated always as … stored") exigem
-- que a expressão seja IMMUTABLE. to_tsvector(regconfig, text) em si é
-- apenas STABLE — mas o problema real é mais subtil: se a função auxiliar
-- receber o parâmetro já tipado como "regconfig", é o PRÓPRIO SITE DA
-- CHAMADA (a expressão da coluna gerada) que tem de converter o literal
-- 'portuguese' (text) para regconfig antes de invocar a função, e essa
-- conversão (regconfigin) é STABLE — o que "contamina" a expressão exterior
-- e continua a falhar, mesmo com a função marcada IMMUTABLE.
-- A correção é receber o nome da configuração como TEXT simples e fazer o
-- cast para regconfig DENTRO do corpo da função: dessa forma, a conversão
-- STABLE fica escondida dentro de uma função que o Postgres já confia ser
-- IMMUTABLE (não inspeciona o corpo), e a expressão exterior só vê dois
-- argumentos de texto. Validado localmente antes de aplicar (ver histórico
-- da conversa) — sem isto, o `create table` da knowledge_base falha com
-- "ERROR: 42P17: generation expression is not immutable".
create or replace function public.imm_to_tsvector(configuracao text, conteudo text)
returns tsvector
language sql
immutable
parallel safe
as $$
  select to_tsvector(configuracao::regconfig, conteudo);
$$;

-- Mesma lógica para array_to_string: apesar de parecer uma função puramente
-- determinística, o Postgres classifica-a como STABLE (não IMMUTABLE) no
-- catálogo (pg_proc.provolatile = 's'), o que também bloqueia o uso direto
-- em colunas geradas — confirmado empiricamente, já que este era o
-- verdadeiro bloqueio remanescente depois de corrigido o to_tsvector acima.
create or replace function public.imm_array_to_string(elementos text[], separador text)
returns text
language sql
immutable
parallel safe
as $$
  select array_to_string(elementos, separador);
$$;

-- ── Perfis ─────────────────────────────────────────────────────────────
-- Estende auth.users. Um perfil é criado automaticamente via trigger
-- sempre que um novo utilizador é criado no Supabase Auth (ver abaixo).
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  role         text not null default 'client' check (role in ('client', 'dev', 'admin')),
  full_name    text not null,
  company_name text,
  phone        text,                      -- formato E.164, ex: +351912345678 (para WhatsApp)
  site_type    text check (site_type in ('institutional', 'ecommerce', 'both')),
  must_change_password boolean not null default true,
  logo_url     text,                      -- logótipo da empresa cliente (bucket "logos"), mostrado após login
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is 'Dados complementares de cada utilizador (clientes, devs, admins).';

-- ── Storage: bucket para os logótipos das empresas clientes ────────────
-- Público para leitura (um logótipo não é informação sensível — simplifica
-- mostrá-lo diretamente por URL, sem assinar pedidos); escrita restrita a
-- admin/dev (ver policy em policies.sql). Idempotente: seguro correr de novo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 2097152, array['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ── Base de Conhecimento (contexto do site da Vértice) ──────────────────
create table if not exists public.knowledge_base (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  content     text not null,
  site_type   text not null default 'both' check (site_type in ('institutional', 'ecommerce', 'both')),
  tags        text[] not null default '{}',
  is_published boolean not null default true,
  created_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  search_vector tsvector generated always as (
    setweight(public.imm_to_tsvector('portuguese', coalesce(title, '')), 'A') ||
    setweight(public.imm_to_tsvector('portuguese', coalesce(content, '')), 'B') ||
    setweight(public.imm_to_tsvector('portuguese', public.imm_array_to_string(coalesce(tags, '{}'), ' ')), 'C')
  ) stored
);

create index if not exists knowledge_base_search_idx on public.knowledge_base using gin (search_vector);
create index if not exists knowledge_base_site_type_idx on public.knowledge_base (site_type);

-- ── Conversas ──────────────────────────────────────────────────────────
create table if not exists public.conversations (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.profiles (id) on delete cascade,
  subject     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists conversations_client_idx on public.conversations (client_id);

-- ── Mensagens ──────────────────────────────────────────────────────────
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role            text not null check (role in ('user', 'assistant', 'system')),
  content         text not null,
  source          text check (source in ('history', 'knowledge_base', 'llm', 'ticket_ack')),
  kb_reference_id uuid references public.knowledge_base (id),
  created_at      timestamptz not null default now()
);

create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);
-- Pesquisa full-text sobre as perguntas já feitas por cada cliente (ver
-- search_client_history abaixo) — não persistida em coluna gerada porque o
-- volume de mensagens por cliente é tipicamente pequeno; calculada em tempo
-- de pesquisa.
create index if not exists messages_role_idx on public.messages (role);

-- ── Tickets (abertos para os devs quando a KB não tem resposta) ───────
create table if not exists public.tickets (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  message_id      uuid references public.messages (id),
  client_id       uuid not null references public.profiles (id) on delete cascade,
  assigned_dev_id uuid references public.profiles (id),
  title           text not null,
  question        text not null,
  llm_answer      text,                -- resposta que a LLM deu ao cliente, para contexto do dev
  status          text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  priority        text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  resolved_at     timestamptz
);

create index if not exists tickets_client_idx on public.tickets (client_id);
create index if not exists tickets_status_idx on public.tickets (status);

-- ── Atualizações/comentários de um ticket (thread interno + respostas ao cliente) ─
create table if not exists public.ticket_updates (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.tickets (id) on delete cascade,
  author_id   uuid not null references public.profiles (id),
  note        text not null,
  visible_to_client boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists ticket_updates_ticket_idx on public.ticket_updates (ticket_id);

-- ── Registo de notificações enviadas (email / whatsapp) ────────────────
create table if not exists public.notifications_log (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.profiles (id) on delete cascade,
  ticket_id   uuid references public.tickets (id) on delete cascade,
  channel     text not null check (channel in ('email', 'whatsapp')),
  event       text not null check (event in ('ticket_created', 'ticket_updated', 'ticket_resolved', 'credentials_issued')),
  status      text not null check (status in ('sent', 'failed', 'skipped')),
  error       text,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_log_client_idx on public.notifications_log (client_id);

-- ── Função de pesquisa full-text na Base de Conhecimento ───────────────
-- Chamada via supabase.rpc('search_knowledge_base', ...) a partir da app.
-- security invoker (default) respeita RLS de knowledge_base do chamador.
create or replace function public.search_knowledge_base(
  query_text text,
  filter_site_type text default null,
  max_results int default 3
)
returns table (
  id uuid,
  title text,
  content text,
  site_type text,
  tags text[],
  is_published boolean,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  rank real
)
language sql
stable
as $$
  select
    kb.id, kb.title, kb.content, kb.site_type, kb.tags, kb.is_published,
    kb.created_by, kb.created_at, kb.updated_at,
    ts_rank_cd(kb.search_vector, plainto_tsquery('portuguese', query_text)) as rank
  from public.knowledge_base kb
  where kb.is_published = true
    and (filter_site_type is null or kb.site_type = filter_site_type or kb.site_type = 'both')
    and kb.search_vector @@ plainto_tsquery('portuguese', query_text)
  order by rank desc
  limit max_results;
$$;

-- ── Função de pesquisa no histórico de perguntas do próprio cliente ────
-- Primeira camada de contexto verificada em cada nova pergunta (antes da
-- base de conhecimento e da LLM — ver core/services/chatService.ts):
-- "este cliente já perguntou algo parecido antes, e já foi respondido?"
-- Para cada pergunta anterior do cliente (mensagens role='user'), devolve
-- também a resposta imediatamente a seguir na mesma conversa (role='assistant').
create or replace function public.search_client_history(
  p_client_id uuid,
  query_text text,
  max_results int default 3
)
returns table (
  question_id uuid,
  question text,
  answer text,
  conversation_id uuid,
  rank real
)
language sql
stable
as $$
  select
    m.id as question_id,
    m.content as question,
    (
      select mm.content
      from public.messages mm
      where mm.conversation_id = m.conversation_id
        and mm.role = 'assistant'
        and mm.created_at > m.created_at
      order by mm.created_at asc
      limit 1
    ) as answer,
    m.conversation_id,
    ts_rank_cd(to_tsvector('portuguese', m.content), plainto_tsquery('portuguese', query_text)) as rank
  from public.messages m
  join public.conversations c on c.id = m.conversation_id
  where c.client_id = p_client_id
    and m.role = 'user'
    and to_tsvector('portuguese', m.content) @@ plainto_tsquery('portuguese', query_text)
  order by rank desc
  limit max_results;
$$;

-- ── Triggers: updated_at automático ────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.knowledge_base;
create trigger set_updated_at before update on public.knowledge_base
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.conversations;
create trigger set_updated_at before update on public.conversations
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.tickets;
create trigger set_updated_at before update on public.tickets
  for each row execute function public.set_updated_at();

-- ── Trigger: criar perfil automaticamente ao criar um utilizador ──────
-- O admin cria o utilizador via Supabase Admin API (auth.admin.createUser)
-- passando full_name/role/etc em user_metadata; este trigger copia esses
-- dados para public.profiles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, company_name, phone, site_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'client'),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.raw_user_meta_data ->> 'company_name',
    new.raw_user_meta_data ->> 'phone',
    coalesce(new.raw_user_meta_data ->> 'site_type', 'institutional')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
