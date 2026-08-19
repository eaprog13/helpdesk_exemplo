-- ════════════════════════════════════════════════════════════════════════
-- Migração: flexibilidade da pesquisa (histórico + base de conhecimento)
--           + limpeza de entradas duplicadas na Base de Conhecimento
-- Gerado a 2026-08-19, na sequência do seguinte bug reportado por um cliente:
--
--   "prazo de entrega de projeto" → sem resposta / erro
--   "projeto entrega"             → resposta correta
--
-- Causa raiz (confirmada com testes diretos ao RPC search_knowledge_base):
--   search_knowledge_base() e search_client_history() usam
--   plainto_tsquery('portuguese', query_text), que junta as palavras da
--   pergunta com AND. Cada palavra a mais na pergunta torna a pesquisa
--   MAIS restritiva, nunca menos — o oposto do que um utilizador espera ao
--   escrever de forma mais completa/natural. "prazo de entrega de projeto"
--   exige que "prazo" E "entrega" E "projeto" apareçam todos na mesma
--   entrada; um artigo que só contém "projeto" (sem a palavra "prazo")
--   deixa de aparecer, mesmo sendo a resposta certa.
--
-- Correção: converter o AND (plainto_tsquery) num OR antes de comparar
-- (`@@`), mantendo o ts_rank_cd (que já premia naturalmente documentos
-- onde MAIS termos da pergunta aparecem perto uns dos outros) como critério
-- de ordenação — ou seja, mais palavras deixam de poder ELIMINAR
-- resultados válidos, só continuam a poder ordená-los melhor.
--
-- Como aplicar: colar este ficheiro completo no SQL Editor do Supabase
-- (dashboard do projeto → SQL Editor → New query) e correr. Idempotente:
-- seguro correr mais do que uma vez.
-- ════════════════════════════════════════════════════════════════════════


-- ── 1) Limpar duplicados na Base de Conhecimento ───────────────────────
-- O seed foi corrido duas vezes (2026-08-19 00:14 e 00:22) sem proteção
-- contra duplicados (insert simples, sem "on conflict"), o que deixou 11
-- entradas repetidas com o mesmo título e conteúdo (só as tags variam — a
-- versão das 00:22 tem tags mais completas). Isto inflacionava
-- artificialmente o ranking dessas entradas (apareciam em dobro nos top-3
-- resultados) à custa de entradas realmente relevantes para a pergunta.
--
-- Antes de apagar a entrada mais antiga de cada par, reatribui-se
-- (`update`) qualquer mensagem do histórico que já a referenciasse
-- (kb_reference_id) para a entrada mais recente e mais completa que fica —
-- preserva o histórico dos clientes sem quebrar a referência.

do $$
declare
  par record;
begin
  for par in
    select old_id, new_id from (values
      ('a2d161da-27ea-4c65-a798-27d8d39ac3fd'::uuid, 'd54314b3-91fe-4c70-a6dd-4806ada94093'::uuid), -- Como contactar a Vértice Digital
      ('076edaa9-eecd-4efa-85d0-c45008cd91a3'::uuid, '66bf0c82-e972-4ca4-9a1f-65f0beb72447'::uuid), -- O que é a Vértice Digital...
      ('caa0039e-e95a-4bb3-b0d4-8da55a514c43'::uuid, '8e68ab2b-14f8-4f94-97b2-0b5b6c2b1d41'::uuid), -- SEO e telemóvel
      ('13652040-a290-4f79-b1e4-13a0c2f9c083'::uuid, '0507526e-7df6-477f-8ec9-6aef60b2f074'::uuid), -- Portefólio de projetos
      ('411e4d72-d1e6-4843-8f7b-ebbff6a7ecfe'::uuid, 'f231fc77-2b4b-4cc0-a7e1-a7032e0b263f'::uuid), -- Proteção de dados pessoais
      ('bd7d7102-3ae5-4904-acf7-49917c914b56'::uuid, '620833de-7a07-4a00-af9a-77ed17e2b1fe'::uuid), -- Quanto tempo demora um projeto
      ('e5093e31-c173-42db-95ca-d51d52aac695'::uuid, '5ac9f658-43e3-48f6-9e5e-66213dc260ab'::uuid), -- Automação e IA
      ('c284f7b8-b57c-4b1f-bb2b-71e9b21c9dd3'::uuid, 'f2620112-4b1d-4661-b661-cee756b24273'::uuid), -- Branding
      ('72d39e70-f827-4541-8e01-f3ad85902b2e'::uuid, 'bd90ac97-f2f4-4369-b992-0483c4953379'::uuid), -- E-Commerce
      ('d1c4c787-a190-42ca-a571-d72b8bdc434d'::uuid, '2d9d1fea-732b-4bde-b071-66c7b660b50d'::uuid), -- Marketing Digital
      ('e6c00171-98ee-4be1-9488-88e6cd7ca6cd'::uuid, '7c0ce1e5-f154-470a-8087-a029b2c9065f'::uuid)   -- Web Development
    ) as pares(old_id, new_id)
  loop
    -- Só reatribui/apaga se a entrada antiga ainda existir E o conteúdo da
    -- nova for realmente igual (defesa extra caso o conteúdo tenha sido
    -- editado manualmente entretanto no painel de admin).
    if exists (
      select 1
      from public.knowledge_base a
      join public.knowledge_base b on b.id = par.new_id
      where a.id = par.old_id and a.content = b.content and a.title = b.title
    ) then
      update public.messages set kb_reference_id = par.new_id where kb_reference_id = par.old_id;
      delete from public.knowledge_base where id = par.old_id;
    end if;
  end loop;
end $$;


-- Impede que isto volte a acontecer: um índice único em "title" faz o
-- "on conflict (title) do nothing" do seed (ver
-- seed_knowledge_base_institucional.sql) ignorar silenciosamente
-- re-execuções em vez de duplicar.
create unique index if not exists knowledge_base_title_idx on public.knowledge_base (title);


-- ── 2) Pesquisa mais flexível na Base de Conhecimento ──────────────────
-- v2 (2026-08-19, depois de validar a v1 com dados reais): o OR sozinho
-- resolve a falta de recall (perguntas com mais palavras deixam de falhar),
-- mas abre uma falha de precisão — "Vértice Digital" aparece no título de
-- quase todos os artigos (peso A, o mais alto), por isso QUALQUER pergunta
-- que mencione o nome da empresa passa a "corresponder" com rank alto a
-- artigos completamente errados (testado: "a Vértice Digital tem
-- certificado SSL" respondia com "Como contactar a Vértice Digital", rank
-- 0.78 — mais alto do que vários acertos reais). Sem LLM ligada como rede
-- de segurança, isto devolvia respostas erradas ao cliente com "confiança"
-- alta. Correção: o rank deixa de ser só ts_rank_cd — multiplica-se pela
-- COBERTURA (fração das palavras distintas da pergunta que este artigo
-- realmente contém). Um artigo que só partilha "Vértice Digital" cobre 2 de
-- 5 palavras (0.4) e cai bastante; um artigo que cobre a pergunta quase
-- toda mantém o rank alto.
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
    -- plainto_tsquery devolve algo como 'prazo' & 'entrega' & 'projet' —
    -- convertido em texto e trocando " & " por " | " obtemos a mesma
    -- tokenização/stemming/remoção de stopwords do dicionário 'portuguese',
    -- mas em OR: uma entrada já corresponde se tiver QUALQUER um dos
    -- termos, não a totalidade (resolve a falta de recall). "termos" é a
    -- lista dos lexemas individuais (já stemmed), usada a seguir para medir
    -- cobertura por artigo.
    select
      to_tsquery(
        'portuguese',
        regexp_replace(plainto_tsquery('portuguese', query_text)::text, ' & ', ' | ', 'g')
      ) as consulta_or,
      regexp_split_to_array(nullif(plainto_tsquery('portuguese', query_text)::text, ''), ' & ') as termos
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
      and consulta.termos is not null
      and kb.search_vector @@ consulta.consulta_or
  )
  select
    c.id, c.title, c.content, c.site_type, c.tags, c.is_published,
    c.created_by, c.created_at, c.updated_at,
    (
      (select count(*) from unnest(c.termos) t where c.search_vector @@ to_tsquery('portuguese', t))::real
      / greatest(array_length(c.termos, 1), 1)
    ) * c.rank_bruto as rank
  from candidatos c
  order by rank desc
  limit max_results;
$$;

-- ── 3) Mesma flexibilidade (e a mesma correção de precisão) no histórico
--      do cliente — ver comentário em search_knowledge_base acima. Aqui o
--      risco de falso positivo por "palavra em comum" é menor (perguntas
--      de clientes não repetem um nome de empresa em todas), mas esta é a
--      camada de MAIOR confiança de todas (reutiliza uma resposta sem a
--      rever de novo), por isso mede-se cobertura da mesma forma.
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
      to_tsquery(
        'portuguese',
        regexp_replace(plainto_tsquery('portuguese', query_text)::text, ' & ', ' | ', 'g')
      ) as consulta_or,
      regexp_split_to_array(nullif(plainto_tsquery('portuguese', query_text)::text, ''), ' & ') as termos
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
      and consulta.termos is not null
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
      (select count(*) from unnest(cd.termos) t where cd.vetor @@ to_tsquery('portuguese', t))::real
      / greatest(array_length(cd.termos, 1), 1)
    ) * cd.rank_bruto as rank
  from candidatos cd
  order by rank desc
  limit max_results;
$$;
