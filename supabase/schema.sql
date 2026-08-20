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
  -- Que tipo(s) de produto o cliente tem com a Vértice (Site
  -- institucional/Loja online/Aplicação Web/Mobile App/Outros) — pode ter
  -- mais do que um (ex.: site institucional E loja online), por isso é
  -- array, não um valor único ("Ambos" já não existe como valor mágico —
  -- ver supabase/migration_tipos_site_multiplos.sql). Define-se sempre por
  -- uma chamada a perfis.atualizar() depois de o perfil já existir (ver
  -- core/services/clientService.ts, criarCliente) — nunca via
  -- raw_user_meta_data/handle_new_user, por isso começa em '{}'.
  site_type    text[] not null default '{}'
    check (site_type <@ array['institutional', 'ecommerce', 'web_app', 'mobile_app', 'other']::text[]),
  must_change_password boolean not null default true,
  logo_url     text,                      -- logótipo da empresa cliente (bucket "logos"), mostrado após login
  -- Significado depende do role — a mesma coluna serve dois propósitos
  -- distintos, mas sem conflito porque nunca se cruzam:
  --   • dev/admin: que equipa(s) a pessoa integra — decide quem é
  --     candidato à atribuição automática de tickets (ver
  --     core/services/ticketService.ts, listarEquipa() só olha para
  --     role in ('dev','admin') — um client aqui nunca entra nessa conta).
  --   • client: que serviços da Vértice Digital este cliente tem
  --     (Desenvolvimento = site/loja, Marketing Digital, Branding/Design)
  --     — só organização/filtro em /admin/clients, nunca usado na
  --     atribuição de tickets.
  -- Array (não um só valor) porque uma pessoa/cliente pode cobrir mais do
  -- que um departamento (ex.: a mesma pessoa a tratar de Marketing e de
  -- Branding/Design; um cliente com site E campanhas de Marketing ativas).
  department   text[] not null default '{}'
    check (department <@ array['desenvolvimento', 'marketing', 'design', 'geral']::text[]),
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
  -- Array vazio '{}' = artigo genérico, aplica-se a todos os tipos de
  -- site/produto (ver search_knowledge_base abaixo) — é o antigo papel de
  -- 'both', que já não existe como valor.
  site_type   text[] not null default '{}'
    check (site_type <@ array['institutional', 'ecommerce', 'web_app', 'mobile_app', 'other']::text[]),
  tags        text[] not null default '{}',
  is_published boolean not null default true,
  -- Catalogação editorial (não calculada): a que departamento pertence o
  -- assunto deste artigo. Metadado por agora — não usado ainda para
  -- classificar automaticamente o departamento de um ticket criado a
  -- partir do chat, ver nota extensa em core/services/chatService.ts.
  department  text check (department in ('desenvolvimento', 'marketing', 'design', 'geral')),
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
-- GIN, não btree: o filtro usa sobreposição de arrays (&&), não igualdade.
create index if not exists knowledge_base_site_type_idx on public.knowledge_base using gin (site_type);
-- Evita duplicados silenciosos ao correr um ficheiro de seed mais do que
-- uma vez (foi o que aconteceu com seed_knowledge_base_institucional.sql,
-- criando 11 entradas repetidas que inflacionavam artificialmente o
-- ranking da pesquisa) — os "insert" do seed usam "on conflict (title) do
-- nothing", que depende deste índice único.
create unique index if not exists knowledge_base_title_idx on public.knowledge_base (title);

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
  -- Nulo = "Por triar": nunca entra na atribuição automática (ver
  -- core/services/ticketService.ts) até um admin/dev lhe definir um
  -- departamento à mão. Definido de duas formas: o próprio cliente escolhe
  -- ao abrir um ticket manualmente (botão "Abrir ticket"), ou um admin
  -- triando um ticket nascido do chat.
  department      text check (department in ('desenvolvimento', 'marketing', 'design', 'geral')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  resolved_at     timestamptz
);

create index if not exists tickets_client_idx on public.tickets (client_id);
create index if not exists tickets_status_idx on public.tickets (status);
create index if not exists tickets_assigned_dev_idx on public.tickets (assigned_dev_id);
create index if not exists tickets_department_idx on public.tickets (department);

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

-- ── Anexos de um ticket (capturas de ecrã/ficheiros para ajudar o dev) ──
-- O cliente pode anexar logo quando o ticket é aberto (ver AvisoTicket no
-- chat) ou mais tarde, a partir do detalhe do pedido — vários ficheiros por
-- ticket, ao contrário do logótipo do cliente que é um só por empresa.
create table if not exists public.ticket_attachments (
  id           uuid primary key default gen_random_uuid(),
  ticket_id    uuid not null references public.tickets (id) on delete cascade,
  uploaded_by  uuid not null references public.profiles (id),
  file_path    text not null,      -- caminho no bucket "ticket-attachments"
  file_name    text not null,      -- nome original do ficheiro, para mostrar na UI
  content_type text not null,
  size_bytes   integer not null,
  created_at   timestamptz not null default now()
);

create index if not exists ticket_attachments_ticket_idx on public.ticket_attachments (ticket_id);

-- Storage: bucket privado para anexos de tickets. Ao contrário do bucket
-- "logos" (público), este é privado — pode conter capturas de ecrã com
-- dados do cliente — e só é acedido através da API (chave service_role),
-- que gera um URL assinado e temporário para mostrar/descarregar cada
-- ficheiro (ver RepositorioArmazenamento.obterUrlAnexoTicket).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ticket-attachments', 'ticket-attachments', false, 5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

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

-- ── Funções auxiliares de pesquisa (histórico + KB) ────────────────────
-- Constroem um tsquery em OR a partir da pergunta do cliente SEM nunca
-- reprocessar texto já stemmed pelo dicionário 'portuguese' — uma
-- tentativa anterior fazia isso (manipular o TEXTO de plainto_tsquery,
-- trocar " & " por " | " e voltar a fazer parse com to_tsquery), e
-- to_tsquery aplica o dicionário a TUDO o que recebe, mesmo a lexemas já
-- entre aspas — não os trata como texto literal. Isso "re-stemma" um
-- lexema que já tinha sido stemmed uma vez, o que para a maioria das
-- palavras dá o mesmo resultado (stemming idempotente) mas NEM SEMPRE:
-- plainto_tsquery('portuguese','problema') dá 'problem'; stemmar 'problem'
-- outra vez dá 'probl' — um lexema diferente, que deixa de bater certo
-- com o que está guardado. Resultado real observado: pesquisar só por
-- "problema" não devolvia NADA, mesmo com vários artigos a conterem essa
-- palavra no título.
--
-- Correção: cada palavra da pergunta passa pelo dicionário UMA ÚNICA VEZ
-- (tsquery_termos, abaixo) e os resultados combinam-se como valores
-- tsquery — nunca como texto — com o operador nativo `||` (OR).
create or replace function public.tsquery_termos(query_text text)
returns setof tsquery
language plpgsql
stable
as $$
declare
  palavra text;
  termo tsquery;
begin
  for palavra in
    select unnest(regexp_split_to_array(trim(coalesce(query_text, '')), '\s+'))
  loop
    if palavra = '' then
      continue;
    end if;
    termo := plainto_tsquery('portuguese', palavra);
    if termo is not null and termo::text <> '' then
      return next termo;
    end if;
  end loop;
  return;
end;
$$;

-- Agregado auxiliar: combina vários tsquery com OR (o Postgres não tem um
-- equivalente nativo a string_agg para tsquery).
create or replace function public.tsquery_or_sfunc(estado tsquery, elemento tsquery)
returns tsquery
language sql
immutable
as $$
  select case
    when estado is null then elemento
    when elemento is null then estado
    else estado || elemento
  end;
$$;

drop aggregate if exists public.tsquery_or_agg(tsquery);
create aggregate public.tsquery_or_agg (tsquery) (
  sfunc = public.tsquery_or_sfunc,
  stype = tsquery
);

-- ── Função de pesquisa full-text na Base de Conhecimento ───────────────
-- Chamada via supabase.rpc('search_knowledge_base', ...) a partir da app.
-- security invoker (default) respeita RLS de knowledge_base do chamador.
--
-- Nota sobre flexibilidade: mais palavras na pergunta nunca eliminam
-- resultados válidos (ver tsquery_termos/tsquery_or_agg acima — a
-- correspondência é OR, não AND), só continuam a poder ordená-los melhor.
--
-- Isto sozinho, porém, cria um problema de precisão: "Vértice Digital"
-- aparece no título (peso A, o mais alto) de quase todos os artigos, por
-- isso QUALQUER pergunta que mencione o nome da empresa "correspondia" com
-- rank alto a artigos completamente errados (testado: "a Vértice Digital
-- tem certificado SSL" respondia com "Como contactar a Vértice Digital",
-- rank 0.78 — mais alto do que vários acertos reais). Sem LLM como rede de
-- segurança, isto devolveria respostas erradas com "confiança" alta. Por
-- isso o rank final não é só ts_rank_cd — multiplica-se pela COBERTURA
-- (fração das palavras distintas da pergunta que o artigo realmente
-- contém): um artigo que só partilha "Vértice Digital" cobre 2 de 5
-- palavras (0.4×) e cai bastante; um artigo que cobre a pergunta quase
-- toda mantém o rank alto.
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
  with consulta as (
    -- Ver comentário em search_knowledge_base acima: mesma construção do
    -- OR palavra-a-palavra (flexibilidade, sem re-stemmar) e a mesma
    -- correção de precisão por cobertura — esta é a camada de MAIOR
    -- confiança de todas (reutiliza uma resposta sem a rever de novo).
    select
      public.tsquery_or_agg(t) as consulta_or,
      array_agg(t) as termos
    from public.tsquery_termos(query_text) as t
  ),
  candidatos as (
    select
      m.id as question_id,
      m.content as question,
      m.conversation_id,
      m.created_at,
      ts_rank_cd(to_tsvector('portuguese', m.content), consulta.consulta_or, 32) as rank_bruto,
      consulta.termos,
      to_tsvector('portuguese', m.content) as vetor
    from public.messages m
    join public.conversations c on c.id = m.conversation_id
    cross join consulta
    where c.client_id = p_client_id
      and m.role = 'user'
      and consulta.consulta_or is not null
      and to_tsvector('portuguese', m.content) @@ consulta.consulta_or
  )
  select
    cd.question_id,
    cd.question,
    (
      select mm.content
      from public.messages mm
      where mm.conversation_id = cd.conversation_id
        and mm.role = 'assistant'
        and mm.created_at > cd.created_at
      order by mm.created_at asc
      limit 1
    ) as answer,
    cd.conversation_id,
    (
      (select count(*) from unnest(cd.termos) t where cd.vetor @@ t)::real
      / greatest(array_length(cd.termos, 1), 1)
    ) * cd.rank_bruto as rank
  from candidatos cd
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
  -- site_type (tal como department) começa sempre em '{}' — nunca vem de
  -- raw_user_meta_data, é definido a seguir por uma chamada explícita a
  -- perfis.atualizar() (ver core/services/clientService.ts, criarCliente).
  insert into public.profiles (id, role, full_name, company_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'client'),
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
