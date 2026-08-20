-- ════════════════════════════════════════════════════════════════════════
-- Migração: corrigir bug de "double stemming" na pesquisa (histórico + KB)
-- Gerado a 2026-08-19.
--
-- CAUSA RAIZ (confirmada com supabase/migration_diagnostico_temp.sql):
--   search_knowledge_base/search_client_history convertiam o AND de
--   plainto_tsquery num OR manipulando o TEXTO do tsquery já processado
--   (trocar " & " por " | " e voltar a fazer parse com to_tsquery). O
--   problema: to_tsquery aplica o dicionário 'portuguese' (stemming) a
--   TUDO o que recebe, incluindo lexemas já entre aspas — não os trata
--   como texto literal, ao contrário do que se assumia. Isso faz
--   "re-stemmar" um lexema que já tinha sido stemmed uma vez.
--
--   Para a maioria das palavras isso calha a dar o mesmo resultado nas
--   duas passagens (stemming idempotente) — mas não sempre. Provado com
--   "problema": plainto_tsquery('portuguese','problema') dá 'problem'; ao
--   voltar a passar 'problem' pelo dicionário (2ª vez), dá 'probl' — um
--   lexema DIFERENTE, que já não bate certo com o que está guardado nos
--   documentos. Resultado: pesquisar só por "problema" (ou "problemas",
--   "um problema", etc.) não devolvia NENHUM resultado, mesmo havendo
--   vários artigos com essa palavra literalmente no título.
--
-- CORREÇÃO: nunca voltar a passar texto já stemmed pelo dicionário. Cada
-- palavra da pergunta é processada pelo dicionário 'portuguese' UMA ÚNICA
-- VEZ (plainto_tsquery por palavra, numa função auxiliar), e os resultados
-- — já como valores tsquery, não texto — combinam-se com o operador nativo
-- `||` (OR). A cobertura (fração de palavras encontradas em cada artigo)
-- passa a comparar tsquery com tsquery diretamente, pela mesma razão.
--
-- Como aplicar: colar no SQL Editor do Supabase e correr. Idempotente
-- (create or replace function / create or replace aggregate não existe em
-- todas as versões do Postgres — por isso faz drop primeiro, seguro).
-- ════════════════════════════════════════════════════════════════════════

-- ── Função auxiliar: divide a pergunta em palavras e devolve o tsquery de
--    CADA UMA já stemmed (uma só vez) pelo dicionário 'portuguese'.
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

-- ── Agregado auxiliar: combina vários tsquery com OR (não existe nativo
--    no Postgres, ao contrário de string_agg para texto).
drop aggregate if exists public.tsquery_or_agg(tsquery);
drop function if exists public.tsquery_or_sfunc(tsquery, tsquery);

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

create aggregate public.tsquery_or_agg (tsquery) (
  sfunc = public.tsquery_or_sfunc,
  stype = tsquery
);

-- ── search_knowledge_base ───────────────────────────────────────────────
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
  with consulta as (
    select
      public.tsquery_or_agg(t) as consulta_or,
      array_agg(t) as termos
    from public.tsquery_termos(query_text) as t
  ),
  candidatos as (
    select
      kb.id, kb.title, kb.content, kb.site_type, kb.tags, kb.is_published,
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
    c.id, c.title, c.content, c.site_type, c.tags, c.is_published,
    c.created_by, c.created_at, c.updated_at,
    (
      (select count(*) from unnest(c.termos) t where c.search_vector @@ t)::real
      / greatest(array_length(c.termos, 1), 1)
    ) * c.rank_bruto as rank
  from candidatos c
  order by rank desc
  limit max_results;
$$;

-- ── search_client_history ───────────────────────────────────────────────
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

-- ── Limpeza: apagar a função de diagnóstico temporária ──────────────────
drop function if exists public.debug_tsquery(text);
