-- Migração: search_client_history deixa de reutilizar o aviso de "ticket
-- aberto" como se fosse uma resposta real. Gerado a 2026-08-20, na
-- sequência da mudança de arquitetura do chat (ver
-- core/services/chatService.ts): perguntas sem resposta no histórico/KB
-- passaram a gravar sempre a MESMA mensagem fixa genérica
-- ("Obrigado pela sua pergunta! ... encaminhei o seu pedido para a nossa
-- equipa técnica...", source='ticket_ack') em vez da tentativa da LLM de
-- responder ao conteúdo.
--
-- Bug descoberto ao testar: search_client_history escolhia sempre a
-- PRIMEIRA mensagem do assistente a seguir à pergunta, sem olhar para
-- "source" — se o cliente perguntasse outra vez algo parecido com uma
-- pergunta anterior que nunca teve resposta real, o sistema devolvia essa
-- mensagem genérica como se já tivesse sido respondida, e NUNCA abria um
-- novo ticket. Um cliente com uma pergunta genuinamente por responder
-- ficava preso a receber sempre o mesmo "encaminhei para a equipa", sem
-- nunca gerar um ticket novo nem chegar a um humano de facto.
--
-- Correção: ignorar mensagens do assistente com source='ticket_ack' ao
-- procurar "a resposta" de uma pergunta anterior — sem resposta real
-- encontrada, cai (corretamente) para a base de conhecimento e, sem nada
-- lá também, abre um ticket novo.
--
-- Como aplicar: colar no SQL Editor do Supabase, ou
--   psql "$DATABASE_URL" -f supabase/migration_historico_ignorar_ticket_ack.sql

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
        -- Um "ticket aberto" nunca é uma resposta real — nunca reutilizar
        -- como se a pergunta já tivesse sido respondida (ver nota acima).
        and (mm.source is null or mm.source <> 'ticket_ack')
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
