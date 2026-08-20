-- Migração: departamentos (Desenvolvimento / Marketing Digital /
-- Branding-Design / Geral) — base para prioridade + atribuição automática
-- de tickets por carga de trabalho. Gerado a 2026-08-20.
--
-- Idempotente (colunas com "add column if not exists", classificação da
-- KB com "update ... where department is null" — não pisa uma
-- classificação já ajustada manualmente por um admin). Seguro correr mais
-- do que uma vez.
--
-- Como aplicar: colar no SQL Editor do Supabase, ou
--   psql "$DATABASE_URL" -f supabase/migration_adicionar_departamentos.sql

-- ── 1) Colunas novas ──────────────────────────────────────────────────
-- profiles.department serve dois propósitos, sem conflito (ver comentário
-- completo em schema.sql): em dev/admin decide elegibilidade na
-- atribuição automática de tickets; em client é só etiqueta organizacional
-- (que serviços da Vértice Digital este cliente tem), nunca usada na
-- atribuição. Array porque uma pessoa/cliente pode cobrir mais do que um
-- departamento. tickets/knowledge_base.department continuam a ser um só
-- valor — um ticket ou artigo pertence a um único assunto.
alter table public.profiles
  add column if not exists department text[] not null default '{}';
alter table public.profiles
  drop constraint if exists profiles_department_check;
alter table public.profiles
  add constraint profiles_department_check
    check (department <@ array['desenvolvimento', 'marketing', 'design', 'geral']::text[]);

alter table public.knowledge_base
  add column if not exists department text
    check (department in ('desenvolvimento', 'marketing', 'design', 'geral'));

alter table public.tickets
  add column if not exists department text
    check (department in ('desenvolvimento', 'marketing', 'design', 'geral'));

create index if not exists tickets_assigned_dev_idx on public.tickets (assigned_dev_id);
create index if not exists tickets_department_idx on public.tickets (department);

-- ── 2) search_knowledge_base passa a devolver também "department" ──────
-- Alterar a lista de colunas devolvidas por uma função exige recriá-la —
-- "create or replace" sozinho não é suficiente quando o "returns table"
-- muda de forma.
drop function if exists public.search_knowledge_base(text, text, int);

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
      and (filter_site_type is null or kb.site_type = filter_site_type or kb.site_type = 'both')
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

-- ── 3) Classificar os artigos da KB que já existem ──────────────────────
-- Catalogação editorial (ver tabela completa na proposta) — "where
-- department is null" para nunca pisar uma classificação já corrigida
-- manualmente por um admin desde a primeira vez que isto correu.
update public.knowledge_base set department = 'desenvolvimento' where department is null and title in (
  'O que é a Vértice Digital e que serviços oferece',
  'Serviço de Websites da Vértice Digital',
  'Serviço de Lojas Online (E-commerce) da Vértice Digital',
  'Desenvolvimento de software e aplicações personalizadas da Vértice Digital',
  'Os websites da Vértice Digital são otimizados para SEO e telemóvel',
  'Diferença entre site institucional e loja online — quando devo migrar',
  'O meu site ou loja online parece estar em baixo',
  'Problema de pagamento na loja online',
  'Não consigo entrar no painel de administração do meu site ou loja',
  'Os visitantes ou clientes da minha loja dizem que não conseguem aceder ao site',
  'Como altero textos, imagens ou informações simples no meu site ou loja',
  'Uma parte do meu site ou loja parece partida ou com erro',
  'Notificações de encomendas ou contacto não chegam por email',
  'O meu site ou loja está lento',
  'Como pedir alterações de conteúdo ou design depois do site estar no ar',
  'Quem trata do domínio e do alojamento (hosting) do meu site',
  'O meu site tem certificado SSL (HTTPS)',
  'O meu site tem cópias de segurança (backups)',
  'O que está incluído no suporte e manutenção pós-lançamento',
  'Que métodos de pagamento posso ativar na minha loja online',
  'Como configurar portes e zonas de envio na loja online',
  'Vários utilizadores podem aceder ao painel de administração do site',
  'O meu site cumpre o RGPD (cookies, formulários e consentimento)',
  'Como reportar um erro (bug) no meu site ou loja online',
  'Pedido de funcionalidade nova no site ou loja',
  'Frequência de atualizações do site ou loja'
);

update public.knowledge_base set department = 'marketing' where department is null and title in (
  'Serviço de Marketing Digital da Vértice Digital'
);

update public.knowledge_base set department = 'design' where department is null and title in (
  'Serviço de Branding da Vértice Digital'
);

update public.knowledge_base set department = 'geral' where department is null and title in (
  'Como funciona o processo de um projeto com a Vértice Digital',
  'Quanto tempo demora um orçamento e um projeto com a Vértice Digital',
  'Quanto custam os serviços da Vértice Digital',
  'Quem é a equipa da Vértice Digital',
  'Como contactar a Vértice Digital',
  'Portefólio de projetos da Vértice Digital',
  'Proteção de dados pessoais no formulário de contacto da Vértice Digital',
  'Como recupero a password de acesso ao centro de apoio',
  'Como sei o estado do meu pedido (ticket)',
  'Como funciona este centro de apoio',
  'Qual é o horário e os canais de apoio da Vértice Digital'
);

-- Deliberadamente NÃO classificado: "Tenho um problema com o meu site ou
-- loja" é a entrada de triagem para perguntas vagas — se ela própria
-- ganhasse um departamento, um ticket nascido de uma pergunta genuinamente
-- ambígua herdava um departamento tão pouco confiante quanto a pergunta
-- que o originou. Fica sempre a null, sempre "Por triar".
