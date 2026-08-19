-- ════════════════════════════════════════════════════════════════════════
-- Migração: afinar títulos operacionais + entrada de triagem genérica
-- Gerado a 2026-08-19, depois de validar seed_knowledge_base_operacional.sql
-- com perguntas reais por categoria. Dois problemas encontrados:
--
-- 1) "tenho um problema com a minha loja online" (a pergunta genérica
--    original, sem nenhum detalhe) continuava a devolver o artigo de
--    MARKETING "Serviço de E-Commerce (lojas online) da Vértice Digital"
--    (rank 0.55) — o título desse artigo é curto e concentra "loja",
--    "online", "Vértice", "Digital" logo no início (peso A), o que lhe dá
--    vantagem estrutural em ts_rank_cd para qualquer pergunta genérica que
--    mencione "loja online", mesmo sem ser sobre vendas. Nenhum artigo
--    operacional específico DEVE responder com confiança a uma pergunta
--    tão vaga — a correção certa é uma entrada de triagem que pede mais
--    detalhe, com um título quase igual à frase real do cliente (por isso
--    ganha por correspondência direta a QUALQUER frase parecida).
--
-- 2) Alguns títulos operacionais eram demasiado longos ("As notificações
--    de encomendas ou de contacto não me estão a chegar por email" — 13
--    palavras, muitas delas de ligação) — títulos longos diluem o peso das
--    palavras-chave (peso A) quando o cliente parafraseia em vez de usar
--    as palavras exatas do título. Testado: a mesma entrada dava rank 0.89
--    para uma frase parecida com o título, mas só 0.33 (abaixo do limiar
--    0.5) para "não recebo emails de encomendas novas" — uma paráfrase
--    perfeitamente normal. Encurtar o título resolve, sem tocar no
--    conteúdo (que já estava correto).
--
-- Como aplicar: colar no SQL Editor do Supabase e correr. Idempotente
-- (os "update" só têm efeito se o título antigo ainda existir; o "insert"
-- usa "on conflict (title) do nothing").
-- ════════════════════════════════════════════════════════════════════════

update public.knowledge_base
set title = 'Problema de pagamento na loja online'
where title = 'Tive um problema com um pagamento na minha loja online';

update public.knowledge_base
set title = 'Notificações de encomendas ou contacto não chegam por email'
where title = 'As notificações de encomendas ou de contacto não me estão a chegar por email';

update public.knowledge_base
set title = 'Pedido de funcionalidade nova no site ou loja'
where title = 'Quero adicionar uma funcionalidade nova ao meu site ou loja';

update public.knowledge_base
set title = 'Frequência de atualizações do site ou loja'
where title = 'Com que frequência o meu site ou loja recebe atualizações';

insert into public.knowledge_base (title, content, site_type, tags, is_published) values
(
  'Tenho um problema com o meu site ou loja',
  'Para ajudarmos mais depressa, descreva o que está a acontecer com mais detalhe: é um problema de pagamento, não consegue aceder ao painel de administração, os seus clientes não conseguem abrir o site, o site ou loja parece estar em baixo ou lento, ou há algo que parece partido ou com erro numa página? Cada uma destas situações tem passos próprios de diagnóstico neste centro de apoio — quanto mais específico for, mais rápido conseguimos ajudar.',
  'both',
  array['problema', 'ajuda', 'suporte', 'duvida', 'nao-sei-o-que-e', 'triagem', 'algo-errado'],
  true
)
on conflict (title) do nothing;
