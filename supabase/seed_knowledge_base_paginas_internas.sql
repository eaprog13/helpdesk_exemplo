-- Base de Conhecimento — mais contextos, extraídos das páginas internas de
-- https://vertice-digital.example/ (deploy Vercel do mesmo site
-- que vertice-digital.example — sitemap confirma os mesmos URLs em vertice-digital.example).
-- Gerado a 2026-08-19. Complementa seed_knowledge_base_institucional.sql
-- (que só cobria a homepage) com o conteúdo de /servicos/*, /sobre,
-- /contactos e /trabalhos/* — páginas de serviço individuais, equipa e
-- portefólio detalhado, incluindo preços indicativos publicados no site.
--
-- ⚠️ ATENÇÃO — discrepância encontrada (confirmada por curl direto ao HTML,
-- incluindo o bloco JSON-LD schema.org/ProfessionalService em "/" e
-- "/contactos", não só pelo resumo do WebFetch):
--   • Email: geral@vertice-digital.example (seed antigo tinha hello@vertice-digital.example)
--   • Telefone: +351 900 000 184 (seed antigo tinha +351 900 000 853)
--   • Slogan: "Soluções digitais que fazem vender" (8 ocorrências na homepage;
--     "Ideias que ganham forma digital", do seed antigo, tem 0 ocorrências)
--   • Não encontrei no site ao vivo as estatísticas "+50 projetos / +1M€
--     gerado / 98% retenção / suporte 24h" do seed antigo — NÃO as repito.
--   • Nota menor: o JSON-LD dá o código postal 1000-100, mas o texto
--     renderizado em /contactos mostra 1000-130 — inconsistência do
--     próprio site, não deste ficheiro. Usei aqui o valor do JSON-LD.
--
-- ⚠️ SEGUNDA REVISÃO (mesmo dia) — eliminação de duplicados/redundância:
-- Comparei este ficheiro com seed_knowledge_base_institucional.sql e
-- encontrei 5 artigos antigos que cobrem o MESMO tópico que os novos
-- artigos abaixo, com conteúdo mais pobre ou já desatualizado. Em vez de
-- deixar as duas versões a competir na pesquisa (search_knowledge_base
-- rankeia por título+conteúdo — duas entradas parecidas dividem a
-- relevância e podem devolver a versão errada), a Secção 0 RENOMEIA os
-- títulos antigos para o título novo, e a Secção 1 faz UPSERT: a
-- coincidência de título faz o "on conflict" substituir o conteúdo antigo
-- pelo novo, ficando UMA única entrada published por tópico. (Nota: a
-- Secção 0 aposenta a linha antiga com is_published = false em vez de a
-- apagar ou renomear — ver comentário lá para o motivo, já testado contra
-- dois erros reais de constraint.) Casos:
--   • "Serviço de Web Development da Vértice Digital" → fundido em
--     "Serviço de Websites da Vértice Digital — o que inclui, tecnologia e prazos"
--   • "Serviço de E-Commerce (lojas online) da Vértice Digital" → fundido em
--     "Serviço de Lojas Online da Vértice Digital — o que inclui, preços e migrações"
--   • "Serviço de Marketing Digital da Vértice Digital" → fundido em
--     "Serviço de Marketing Digital da Vértice Digital — o que inclui, preços e prazos"
--   • "Serviço de Branding da Vértice Digital" → fundido em
--     "Serviço de Branding da Vértice Digital — o que inclui e preços"
--   • "Portefólio de projetos da Vértice Digital" → fundido em
--     "Portefólio detalhado — resultados dos projetos da Vértice Digital"
--     (o conteúdo fundido junta os 3 casos de estudo detalhados com página
--     própria em /trabalhos + a lista mais alargada de clientes/logótipos
--     da homepage. Deixei de fora "Lua" — app .NET MAUI mencionada só no
--     seed antigo — porque não encontrei nenhuma ocorrência no site ao
--     vivo (homepage nem /trabalhos); pode ter sido descontinuada ou nunca
--     ter estado no site — confirmar antes de voltar a publicar essa info.)
--
-- Também encontrei um CONFLITO direto de dados (não só duplicação): o
-- artigo antigo "Quanto tempo demora a desenvolver um projeto" dizia
-- "site institucional: 2 a 4 semanas", mas a página /servicos/websites do
-- site ao vivo diz "4 a 12 semanas". A Secção 1 corrige o conteúdo deste
-- artigo (mesmo título, sem precisar de rename) para usar o prazo
-- confirmado e remeter para os artigos de cada serviço quanto aos
-- restantes prazos (loja online, marketing, branding — o site não publica
-- um número fixo para esses, por isso não invento um).
--
-- ⚠️ NÃO CORRIGIDO NESTE FICHEIRO (decisão de negócio, não duplicado) —
-- fica por decidir por quem gere a KB: o artigo "Serviço de Automação e
-- Inteligência Artificial da Vértice Digital" (em
-- seed_knowledge_base_institucional.sql) descreve um serviço que já não
-- aparece no catálogo de serviços do site ao vivo (que lista só 4:
-- Websites, Lojas online, Marketing digital, Branding — confirmado no
-- JSON-LD hasOfferCatalog). Pode ter sido descontinuado, ou só não tem
-- página própria ainda. Não toquei nesta entrada — confirmar com a Vértice
-- Digital se o serviço continua a existir antes de editar/despublicar.
--
-- Como aplicar: colar no SQL Editor do Supabase, ou
--   psql "$DATABASE_URL" -f supabase/seed_knowledge_base_paginas_internas.sql
-- Idempotente: os "update" de título só têm efeito se o título antigo
-- ainda existir; os inserts finais usam "on conflict (title)".

-- ── 0) Aposentar as entradas antigas que o UPSERT da Secção 1 substitui ──
-- Tentei primeiro "update ... set title" (renomear para o título novo) —
-- colidia com a constraint única do título quando a linha nova já existia
-- de uma corrida anterior deste ficheiro. Tentei depois "delete" — falha
-- com "violates foreign key constraint messages_kb_reference_id_fkey"
-- sempre que essa entrada já foi usada como resposta a um cliente
-- (messages.kb_reference_id aponta para knowledge_base.id; apagar a linha
-- partia esse histórico). A solução correta é não tocar no título nem
-- apagar a linha — só marcar is_published = false. search_knowledge_base
-- filtra sempre "where kb.is_published = true" (ver schema.sql), por isso
-- a entrada antiga deixa de poder ser devolvida numa pesquisa nova, mas
-- continua a existir para qualquer mensagem antiga que já a referencie.
-- Idempotente: não faz mal correr outra vez (já fica is_published = false).

update public.knowledge_base
set is_published = false, updated_at = now()
where title = 'Serviço de Web Development da Vértice Digital';

update public.knowledge_base
set is_published = false, updated_at = now()
where title = 'Serviço de E-Commerce (lojas online) da Vértice Digital';

update public.knowledge_base
set is_published = false, updated_at = now()
where title = 'Serviço de Marketing Digital da Vértice Digital';

update public.knowledge_base
set is_published = false, updated_at = now()
where title = 'Serviço de Branding da Vértice Digital';

update public.knowledge_base
set is_published = false, updated_at = now()
where title = 'Portefólio de projetos da Vértice Digital';

-- ── 1) Correções e fusões — UPSERT (substitui conteúdo antigo/duplicado) ─

insert into public.knowledge_base (title, content, site_type, tags, is_published) values
(
  'Como contactar a Vértice Digital',
  'Email: geral@vertice-digital.example. Telefone: +351 900 000 184 (chamada para rede móvel nacional). Morada: Parque Empresarial de Monte Verde, 1000-100 Monte Verde, Portugal — a 40 minutos de Lisboa e a 5 minutos de Vale Fundo. A Vértice Digital responde a pedidos de orçamento em 24 horas úteis, com preço e prazo indicativos. Está também presente no LinkedIn (linkedin.com/company/vertice-digital) e no Instagram (instagram.com/verticedigital). Livro de reclamações eletrónico disponível em livroreclamacoes.pt.',
  'both',
  array['contactos', 'apoio', 'morada', 'telefone', 'email', 'localizacao', 'falar-com-a-equipa', 'livro-de-reclamacoes'],
  true
),
(
  'O que é a Vértice Digital e que serviços oferece',
  'A Vértice Digital é uma agência digital sediada no Parque Empresarial de Monte Verde, Portugal, a construir para empresas portuguesas desde 2019. Slogan: "Soluções digitais que fazem vender". Cria websites, lojas online (e-commerce), marketing digital e branding, com abordagem de código à medida (sem templates). Mantém também um produto próprio, o TorkFlow, o que a equipa aponta como fator de responsabilização técnica sobre as decisões que recomenda aos clientes. Área de atuação: todo o Portugal, com sede em Monte Verde.',
  'both',
  array['sobre', 'empresa', 'vertice-digital', 'servicos', 'quem-somos', 'agencia-digital', 'monte-verde', 'apresentacao', 'torkflow'],
  true
),
(
  'Serviço de Websites da Vértice Digital — o que inclui, tecnologia e prazos',
  'A Vértice Digital desenvolve websites focados em resultados mensuráveis (pedidos de contacto, marcações, chamadas), não "brochuras online". Usa WordPress quando o cliente precisa de autonomia editorial, e Next.js quando o projeto exige velocidade ou integrações à medida. Entregáveis: arquitetura de informação e wireframes, design próprio (sem temas comprados), desenvolvimento responsivo e acessível, uma sessão de formação gravada para gestão de conteúdo, alojamento, backups e monitorização, e 30 dias de suporte pós-lançamento. Nenhum site sai sem passar nos Core Web Vitals. Prazo: 4 a 12 semanas, dependendo sobretudo do volume de conteúdo e fotografia (raramente do design). O site, o domínio e as credenciais de acesso pertencem sempre ao cliente.',
  'institutional',
  array['websites', 'servicos', 'wordpress', 'nextjs', 'core-web-vitals', 'prazos', 'suporte-pos-lancamento', 'propriedade-do-site'],
  true
),
(
  'Serviço de Lojas Online da Vértice Digital — o que inclui, preços e migrações',
  'A Vértice Digital é especializada em lojas WooCommerce e em migrações de plataforma, incluindo migração de catálogos com mais de 8.000 referências sem perder posicionamento no motor de busca. Entregáveis: estruturação e migração de catálogo, checkout otimizado com métodos de pagamento nacionais, integração com faturação e transportadoras, redirecionamentos 301 e preservação de SEO na migração, dashboard de métricas de vendas, e formação em gestão de encomendas. Preço indicativo: uma loja começa nos 6.000 €; migrações de catálogo grande são orçamentadas à parte, por volume de referências. Direcionado a negócios com catálogo e stock reais, ou a lojas numa plataforma que ficou lenta, cara ou foi descontinuada.',
  'ecommerce',
  array['lojas-online', 'ecommerce', 'woocommerce', 'migracao', 'preco', 'orcamento', 'redirecionamentos-301', 'seo', 'catalogo'],
  true
),
(
  'Serviço de Marketing Digital da Vértice Digital — o que inclui, preços e prazos',
  'A Vértice Digital trabalha SEO técnico, Google Ads e campanhas Meta, com foco em medir o retorno (não em "impressões" ou métricas de vaidade) — o ponto de partida é sempre perceber quanto vale um cliente novo para o negócio. Entregáveis: auditoria técnica de SEO e plano de correção, configuração de medição e conversões, gestão de campanhas Google e Meta, produção de conteúdo otimizado, e relatório mensal em linguagem de negócio (não só métricas técnicas). Preço indicativo: gestão a partir de 750 €/mês, com investimento mínimo recomendado em anúncios de 500 €/mês. Resultados em anúncios pagos surgem em 2 a 4 semanas; SEO demora tipicamente 3 a 6 meses. Direcionado a empresas que já investem em anúncios sem saber o retorno, ou que dependem só do passa-palavra e querem previsibilidade.',
  'both',
  array['marketing-digital', 'seo', 'google-ads', 'meta-ads', 'preco', 'orcamento', 'roi', 'prazos'],
  true
),
(
  'Serviço de Branding da Vértice Digital — o que inclui e preços',
  'A Vértice Digital desenvolve identidade de marca para negócios em mudança de escala, fusões, ou cuja imagem visual já não reflete o que a empresa é hoje. Entregáveis: diagnóstico de posicionamento, identidade visual e sistema de aplicação, manual de normas em PDF e ficheiros em formato aberto, papelaria e aplicações digitais, e kit para redes sociais. A proposta de design é única e defendida (não várias opções à escolha), com duas rondas de revisão incluídas. Fazer só um logótipo (sem manual de aplicação) é possível mas normalmente pouco eficaz — a consistência degrada-se em poucos meses sem regras definidas. Preço indicativo: identidade completa a partir de 4.500 €; revisão de marca já existente a partir de 2.000 €.',
  'both',
  array['branding', 'identidade-visual', 'preco', 'orcamento', 'logotipo', 'manual-de-normas', 'revisao-de-marca'],
  true
),
(
  'Portefólio detalhado — resultados dos projetos da Vértice Digital',
  'Casos de estudo com página própria em /trabalhos: Horizonte Multimédia (loja online, 2026) — migração de um catálogo com mais de 8.000 referências de Magento para WooCommerce, com crescimento de mais de 50% nas vendas depois da transição. Monte Verde Gaming Fest (portal de evento, 2026) — portal que recebe num único fim de semana o tráfego equivalente a um ano inteiro, mais de 100 mil visitas em quatro dias, sem quebra de serviço. Feira Medieval de Monte Verde (site de eventos, 2026) — site multilingue de um dos eventos com maior afluência da região, mais de 40 mil encaminhamentos para a compra de bilhetes. Outros clientes que confiaram na Vértice Digital, sem caso de estudo dedicado no site (logótipos na homepage): Monte Verde Criativa, Café do Largo, Linho Azul, Trilhos & Aventura, Atelier Clara e Inês Duarte.',
  'both',
  array['portefolio', 'projetos', 'clientes', 'casos-de-estudio', 'horizonte-multimedia', 'monte-verde-gaming-fest', 'feira-medieval-de-monte-verde', 'resultados'],
  true
),
(
  'Quanto tempo demora a desenvolver um projeto com a Vértice Digital',
  'Um website institucional demora tipicamente entre 4 a 12 semanas, dependendo sobretudo do volume de conteúdo e fotografia a preparar — raramente do design. Para lojas online, marketing digital e branding, os prazos e preços têm particularidades próprias a cada serviço — ver "Serviço de Lojas Online da Vértice Digital", "Serviço de Marketing Digital da Vértice Digital" e "Serviço de Branding da Vértice Digital" para detalhes. Em qualquer caso, a Vértice Digital define prazos claros no início do projeto e acompanha o cliente em todas as fases (ver "Metodologia da Vértice Digital — as 6 fases de um projeto").',
  'both',
  array['prazos', 'processo', 'faq', 'quanto-tempo', 'tempo-de-entrega', 'duracao', 'prazo-de-entrega'],
  true
) on conflict (title) do update set
  content = excluded.content,
  tags = excluded.tags,
  site_type = excluded.site_type,
  is_published = excluded.is_published,
  updated_at = now();

-- ── 2) Novos contextos sem equivalente antigo — inserção normal ─────────

insert into public.knowledge_base (title, content, site_type, tags, is_published) values
(
  'Quem é a equipa da Vértice Digital',
  'A Vértice Digital é liderada por duas pessoas que também são quem executa o trabalho, sem intermediários entre decisão e execução: Ricardo Fonseca (CEO & Developer) e Tiago Fonseca (CTO & Developer). A agência destaca que é a mesma pessoa que acompanha o cliente desde o briefing inicial até ao acompanhamento pós-lançamento.',
  'both',
  array['equipa', 'quem-somos', 'sobre', 'ricardo-fonseca', 'tiago-fonseca', 'fundadores'],
  true
),
(
  'Metodologia da Vértice Digital — as 6 fases de um projeto',
  'Todos os projetos da Vértice Digital seguem seis fases: 1) Briefing — ouvir antes de propor; 2) Estratégia — decidir o que vale a pena fazer; 3) Design — uma proposta única e defendida (não várias opções à escolha); 4) Build — código à medida, sem templates comprados; 5) Lançamento — testes antes de publicar; 6) Evolução — medição e afinação contínuas depois do lançamento.',
  'both',
  array['processo', 'metodologia', 'fases-do-projeto', 'como-trabalhamos', 'briefing', 'estrategia', 'design', 'build', 'lancamento', 'evolucao'],
  true
),
(
  'Preservação de SEO ao migrar de plataforma de loja online',
  'Sim, é possível preservar o posicionamento SEO ao migrar uma loja online de plataforma (por exemplo, de Magento para WooCommerce), desde que o mapa de redirecionamentos seja feito produto a produto antes do lançamento da nova loja. A Vértice Digital já fez esta migração num catálogo com mais de 8.000 referências.',
  'ecommerce',
  array['seo', 'migracao', 'redirecionamentos', 'woocommerce', 'magento', 'preservar-posicionamento'],
  true
),
(
  'Como pedir um orçamento à Vértice Digital',
  'O processo começa com o cliente a indicar o que quer construir através do site (vertice-digital-website / vertice-digital.example) ou dos contactos diretos. A Vértice Digital responde em 24 horas úteis com um preço e prazo indicativos. Não há reuniões comerciais longas antes disto — a resposta inicial já inclui uma estimativa concreta.',
  'both',
  array['orcamento', 'pedir-orcamento', 'processo-comercial', 'primeiro-contacto', 'proposta'],
  true
) on conflict (title) do nothing;
