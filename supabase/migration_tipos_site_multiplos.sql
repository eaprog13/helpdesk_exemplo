-- Migração: site_type passa de valor único para array de valores —
-- um cliente pode ter mais do que um tipo de produto com a Vértice (ex.:
-- site institucional E loja online), e isso deve aparecer como tal em vez
-- de um valor genérico "Ambos". Aproveita para alargar o leque de tipos
-- (Aplicação Web, Mobile App, Outros), já que a Vértice também desenvolve
-- esse tipo de produto e não só sites/lojas. Gerado a 2026-08-20.
--
-- 'both' deixa de ser um valor válido:
--   • em profiles.site_type, um cliente que tinha 'both' passa a
--     {institutional, ecommerce} (era exatamente o que "Ambos" queria
--     dizer) — RECOMENDA-SE rever estes clientes em /admin/clients depois
--     de aplicar, para confirmar que corresponde à realidade.
--   • em knowledge_base.site_type, 'both' passa a '{}' (array vazio) —
--     o novo significado de "artigo genérico, aplica-se a todos os tipos"
--     (ver search_knowledge_base abaixo). Era exatamente o papel que
--     'both' já desempenhava ali, só que agora é um caso claro (lista
--     vazia) em vez de um valor mágico no meio da lista de tipos válidos.
--
-- Requer supabase/migration_adicionar_departamentos.sql já aplicada (usa
-- a mesma tabela profiles/knowledge_base já com a coluna department).
--
-- Como aplicar: colar no SQL Editor do Supabase, ou
--   psql "$DATABASE_URL" -f supabase/migration_tipos_site_multiplos.sql

-- ── 1) profiles.site_type: text → text[] ────────────────────────────────
alter table public.profiles drop constraint if exists profiles_site_type_check;
-- Tem de se largar o "default" ANTES de mudar o tipo da coluna — o
-- Postgres não sabe converter sozinho um default 'x' (text) para text[]
-- ("default for column ... cannot be cast automatically to type text[]").
alter table public.profiles alter column site_type drop default;
alter table public.profiles
  alter column site_type type text[]
  using case
    when site_type is null then '{}'::text[]
    when site_type = 'both' then array['institutional', 'ecommerce']
    else array[site_type]
  end;
alter table public.profiles alter column site_type set default '{}';
alter table public.profiles alter column site_type set not null;
alter table public.profiles
  add constraint profiles_site_type_check
    check (site_type <@ array['institutional', 'ecommerce', 'web_app', 'mobile_app', 'other']::text[]);

-- ── 2) knowledge_base.site_type: text → text[] ──────────────────────────
alter table public.knowledge_base drop constraint if exists knowledge_base_site_type_check;
-- Mesma razão do passo 1 — esta coluna tinha "default 'both'".
alter table public.knowledge_base alter column site_type drop default;
alter table public.knowledge_base
  alter column site_type type text[]
  using case
    when site_type = 'both' then '{}'::text[]
    else array[site_type]
  end;
alter table public.knowledge_base alter column site_type set default '{}';
alter table public.knowledge_base alter column site_type set not null;
alter table public.knowledge_base
  add constraint knowledge_base_site_type_check
    check (site_type <@ array['institutional', 'ecommerce', 'web_app', 'mobile_app', 'other']::text[]);

-- Índice de igualdade não serve para o novo operador de sobreposição
-- (&&) usado pela pesquisa abaixo — GIN é o índice certo para arrays.
drop index if exists public.knowledge_base_site_type_idx;
create index if not exists knowledge_base_site_type_idx on public.knowledge_base using gin (site_type);

-- ── 3) search_knowledge_base: filtro por sobreposição de arrays ────────
-- Alterar o tipo de "site_type" (agora text[]) exige recriar a função —
-- "create or replace" sozinho não é suficiente quando o "returns table"
-- muda de forma (ver o mesmo problema em migration_adicionar_departamentos.sql).
drop function if exists public.search_knowledge_base(text, text, int);

create or replace function public.search_knowledge_base(
  query_text text,
  filter_site_types text[] default null,
  max_results int default 3
)
returns table (
  id uuid,
  title text,
  content text,
  site_type text[],
  tags text[],
  is_published boolean,
  department text,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  rank real
)
language sql
stable
as $$
  with consulta as (
    select
      public.tsquery_or_agg(t) as consulta_or,
      array_agg(t) as termos
    from public.tsquery_termos(query_text) as t
  ),
  candidatos as (
    select
      kb.id, kb.title, kb.content, kb.site_type, kb.tags, kb.is_published, kb.department,
      kb.created_by, kb.created_at, kb.updated_at,
      ts_rank_cd(kb.search_vector, consulta.consulta_or, 32) as rank_bruto,
      consulta.termos,
      kb.search_vector
    from public.knowledge_base kb, consulta
    where kb.is_published = true
      and (
        -- Sem filtro (cliente sem nenhum tipo definido) → não restringe.
        filter_site_types is null or array_length(filter_site_types, 1) is null
        -- Artigo genérico (sem tipo específico) → aplica-se sempre.
        or kb.site_type = '{}'
        -- Caso comum: algum tipo do cliente está entre os tipos do artigo.
        or kb.site_type && filter_site_types
      )
      and consulta.consulta_or is not null
      and kb.search_vector @@ consulta.consulta_or
  )
  select
    c.id, c.title, c.content, c.site_type, c.tags, c.is_published, c.department,
    c.created_by, c.created_at, c.updated_at,
    (
      (select count(*) from unnest(c.termos) t where c.search_vector @@ t)::real
      / greatest(array_length(c.termos, 1), 1)
    ) * c.rank_bruto as rank
  from candidatos c
  order by rank desc
  limit max_results;
$$;

-- ── 4) handle_new_user: já não escreve site_type a partir dos metadados ─
-- Tal como "department", site_type passa a ser sempre definido por uma
-- segunda chamada (perfis.atualizar) depois de o perfil já existir — ver
-- core/services/clientService.ts, criarCliente(). Fica sempre a começar
-- em '{}' (o default da coluna) até essa chamada acontecer.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, company_name, phone)
  values (
    new.id,
    -- role só de app_metadata — ver supabase/migration_proteger_role.sql
    coalesce(new.raw_app_meta_data ->> 'role', 'client'),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.raw_user_meta_data ->> 'company_name',
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Verificação rápida ───────────────────────────────────────────────────
-- Clientes que tinham 'both' (agora {institutional,ecommerce}) — confirmar
-- que corresponde à realidade de cada um em /admin/clients:
select id, full_name, company_name, site_type
from public.profiles
where role = 'client' and site_type = array['institutional', 'ecommerce']
order by full_name;
