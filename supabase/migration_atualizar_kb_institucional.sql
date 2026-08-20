-- NOTA (2026-08-20): site_type passou de valor único para array (ver
-- supabase/migration_tipos_site_multiplos.sql) — requer essa migração já
-- aplicada.
--
-- Migração: atualizar os factos institucionais da Base de Conhecimento
-- para o que está publicado hoje em https://vertice-digital.example/
-- Gerado a 2026-08-20.
--
-- Motivo: a primeira versão de seed_knowledge_base_institucional.sql
-- tinha sido gerada a partir de outra versão do site — email (hello@ em
-- vez de geral@), telefone, morada, portefólio (clientes que já não
-- aparecem no site atual) e um serviço de "Automação e IA" que já não
-- existe como página própria estavam todos desatualizados. Como o seed
-- usa "on conflict (title) do nothing", voltar a correr o ficheiro NÃO
-- corrige linhas já inseridas — só esta migração o faz.
--
-- Esta migração é segura de correr mais do que uma vez (idempotente):
--   1) Remove as 3 entradas cujo título mudou por completo (o conteúdo
--      antigo, sob esse título, deixou de ser válido).
--   2) Substitui o conteúdo das entradas cujo título se manteve, pelos
--      factos atuais ("on conflict (title) do update").
--
-- Nota: isto só toca nas entradas de FACTOS DO SITE (sempre
-- is_published = true, geridas por nós). Não mexe nos "contextos de
-- suporte sugeridos" [REVER] — esses ficam como estavam até serem
-- revistos manualmente em /admin/knowledge-base, para não apagar edições
-- que um admin já possa ter feito por cima do rascunho original.
--
-- Como aplicar: colar no SQL Editor do Supabase, ou
--   psql "$DATABASE_URL" -f supabase/migration_atualizar_kb_institucional.sql

-- ── 1) Retirar entradas cujo título mudou por completo ──────────────────
delete from public.knowledge_base
where title in (
  'Serviço de Web Development da Vértice Digital',
  'Serviço de E-Commerce (lojas online) da Vértice Digital',
  'Serviço de Automação e Inteligência Artificial da Vértice Digital',
  'Quanto tempo demora a desenvolver um projeto com a Vértice Digital'
);

-- ── 2) Atualizar (ou inserir, se ainda não existirem) os factos atuais ──
-- Mesmo conteúdo de supabase/seed_knowledge_base_institucional.sql §1 —
-- manter os dois ficheiros em sincronia sempre que o site mudar outra vez.
insert into public.knowledge_base (title, content, site_type, tags, is_published) values
(
  'O que é a Vértice Digital e que serviços oferece',
  'A Vértice Digital é uma agência digital sediada no Parque Empresarial de Monte Verde, Portugal, a construir para empresas portuguesas desde 2019. Não há camadas entre quem decide e quem executa — a mesma pessoa acompanha um projeto do briefing ao pós-lançamento. Serviços principais: websites, lojas online, marketing digital e branding; a empresa também desenvolve aplicações personalizadas, portais e soluções de software à medida (mantém, inclusive, um produto próprio, o TorkFlow). Atua em todo o território nacional e também para clientes internacionais.',
  '{}'::text[],
  array['sobre', 'empresa', 'vertice-digital', 'servicos', 'quem-somos', 'agencia-digital', 'monte-verde', 'apresentacao'],
  true
),
(
  'Serviço de Websites da Vértice Digital',
  'Inclui arquitetura de informação e wireframes, design à medida (sem temas comprados), desenvolvimento responsivo e acessível, uma sessão de formação gravada de gestão de conteúdos, alojamento com backups e monitorização, e 30 dias de acompanhamento pós-lançamento. Consoante o projeto, é construído em WordPress (quando o cliente precisa de autonomia editorial) ou em Next.js (quando o requisito é velocidade ou integrações personalizadas). Todos os sites são validados nos Core Web Vitals antes de serem lançados. Prazo habitual: 4 a 12 semanas, dependendo do volume de conteúdo — os conteúdos e fotografias do cliente costumam ser o fator que mais influencia o prazo. O site, o domínio e os acessos ficam sempre em nome do cliente.',
  array['institutional'],
  array['web-development', 'websites', 'seo', 'servicos', 'criacao-de-sites', 'site-institucional', 'desenvolvimento-web', 'responsivo', 'wordpress', 'nextjs', 'prazos'],
  true
),
(
  'Serviço de Lojas Online (E-commerce) da Vértice Digital',
  'Inclui estruturação do catálogo e migração de dados de plataformas antigas, checkout otimizado com métodos de pagamento nacionais, integração com faturação e transportadoras, redirecionamentos (301) para preservar o posicionamento no Google em migrações, um painel de métricas de vendas, e formação de gestão de encomendas. As lojas são construídas em WooCommerce. Valor de referência: lojas base a partir de 6.000€; migrações de catálogos grandes (a Vértice Digital já migrou catálogos com mais de 8.000 referências sem perder posições no Google) são orçamentadas à parte, consoante o volume de produtos. Exemplo real: a migração da loja Horizonte Multimédia (Magento → WooCommerce) resultou em vendas a crescer mais de 50% depois da mudança.',
  array['ecommerce'],
  array['ecommerce', 'loja-online', 'servicos', 'portefolio', 'lojas-online', 'vender-online', 'criar-loja', 'plataforma-de-vendas', 'woocommerce', 'migracao', 'precos'],
  true
),
(
  'Desenvolvimento de software e aplicações personalizadas da Vértice Digital',
  'Além de websites, lojas online, marketing digital e branding, a Vértice Digital desenvolve aplicações personalizadas, portais e soluções de software à medida das necessidades de cada empresa (por exemplo, o portal do evento Monte Verde Gaming Fest, com mais de 100 mil visitas em quatro dias). A própria equipa mantém um produto de software próprio, o TorkFlow.',
  '{}'::text[],
  array['software', 'aplicacoes-personalizadas', 'portais', 'desenvolvimento', 'servicos', 'torkflow'],
  true
),
(
  'Serviço de Marketing Digital da Vértice Digital',
  'Inclui SEO técnico (auditorias, plano de correções e otimização de conteúdo), gestão de campanhas Google Ads e Meta Ads, configuração de tracking de conversão (chamadas, formulários e vendas), produção de conteúdo e relatórios mensais escritos em linguagem de negócio (investimento, número de contactos, custo por contacto). O acompanhamento de conversões é montado antes de qualquer investimento em anúncios. Valor de referência: gestão a partir de 750€/mês, com um investimento mínimo recomendado de 500€/mês em anúncios — este último é pago diretamente às plataformas (Google/Meta), não à Vértice Digital. Resultados: campanhas pagas mostram resultados em 2 a 4 semanas; SEO exige normalmente 3 a 6 meses para uma análise significativa.',
  '{}'::text[],
  array['marketing-digital', 'trafego', 'servicos', 'ads', 'google-ads', 'meta-ads', 'seo', 'redes-sociais', 'publicidade', 'precos'],
  true
),
(
  'Serviço de Branding da Vértice Digital',
  'Inclui diagnóstico de posicionamento, identidade visual e respetivo sistema de aplicação, manual de normas em PDF com os ficheiros abertos, papelaria e aplicações digitais, e um kit para redes sociais. Estão incluídas duas rondas de ajustes. A Vértice Digital apresenta uma proposta única e defendida — não várias opções à escolha — porque considera a direção estratégica da sua responsabilidade. Valor de referência: identidade completa a partir de 4.500€; revisão de uma marca já existente a partir de 2.000€.',
  '{}'::text[],
  array['branding', 'identidade-visual', 'servicos', 'logotipo', 'design-grafico', 'marca', 'identidade-de-marca', 'precos'],
  true
),
(
  'Como funciona o processo de um projeto com a Vértice Digital',
  'O processo segue seis etapas: Briefing, Estratégia, Design, Build, Lançamento e Evolução — o lançamento é tratado como o início do trabalho, não o fim. A mesma pessoa acompanha o cliente desde o briefing inicial até ao apoio pós-lançamento, sem transferências entre equipas.',
  '{}'::text[],
  array['processo', 'metodologia', 'etapas', 'faq', 'como-funciona'],
  true
),
(
  'Quanto tempo demora um orçamento e um projeto com a Vértice Digital',
  'A Vértice Digital responde a pedidos de orçamento em 24 horas úteis, já com um valor e um prazo. Prazos de entrega habituais: um website institucional demora normalmente entre 4 e 12 semanas (os conteúdos e fotografias do cliente costumam ser o fator que mais influencia o prazo); uma loja online depende do volume de catálogo e é orçamentada à parte.',
  '{}'::text[],
  array['prazos', 'processo', 'faq', 'quanto-tempo', 'tempo-de-entrega', 'duracao', 'prazo-de-entrega', 'orcamento', 'sla'],
  true
),
(
  'Quanto custam os serviços da Vértice Digital',
  'Os preços dependem sempre do âmbito de cada projeto — o valor exato só é dado após um pedido de orçamento (resposta em 24 horas úteis). Como referência do que está publicado no site: loja online a partir de 6.000€ (migrações de catálogos grandes orçamentadas à parte); identidade de marca completa a partir de 4.500€; revisão de uma marca existente a partir de 2.000€; gestão de marketing digital a partir de 750€/mês, mais um investimento mínimo recomendado de 500€/mês em anúncios (pago diretamente às plataformas). Para websites institucionais não há um valor de partida publicado — depende do âmbito, pedir orçamento.',
  '{}'::text[],
  array['precos', 'orcamento', 'valores', 'faq', 'quanto-custa', 'tabela-de-precos'],
  true
),
(
  'Os websites da Vértice Digital são otimizados para SEO e telemóvel',
  'Sim. Os websites são desenvolvidos com abordagem mobile-first, validados nos Core Web Vitals antes do lançamento, e incluem SEO técnico desde o início — dados estruturados, sitemap e metadados.',
  '{}'::text[],
  array['seo', 'mobile', 'faq', 'telemovel', 'responsivo', 'core-web-vitals', 'posicionamento-google'],
  true
),
(
  'Quem é a equipa da Vértice Digital',
  'A Vértice Digital é liderada por Ricardo Fonseca (CEO e Developer) e Tiago Fonseca (CTO e Developer). É uma equipa pequena e sem camadas entre quem decide e quem executa — a mesma pessoa que faz o briefing inicial acompanha o projeto até ao apoio pós-lançamento. A empresa está atualmente a recrutar.',
  '{}'::text[],
  array['equipa', 'quem-somos', 'sobre', 'fundadores'],
  true
),
(
  'Como contactar a Vértice Digital',
  'Email: geral@vertice-digital.example. Telefone: +351 900 000 184 (chamada para a rede móvel nacional). Morada: Parque Empresarial de Monte Verde, 1000-100 Monte Verde, Portugal (a cerca de 40 minutos de Lisboa e 5 minutos de Vale Fundo). Também é possível pedir orçamento através do formulário de contacto do site (3 passos, cerca de 2 minutos), com resposta em 24 horas úteis. Redes sociais: Instagram (@verticedigital) e LinkedIn (Vértice Digital).',
  '{}'::text[],
  array['contactos', 'apoio', 'morada', 'telefone', 'email', 'localizacao', 'falar-com-a-equipa'],
  true
),
(
  'Portefólio de projetos da Vértice Digital',
  'Projetos em destaque no site da Vértice Digital: Horizonte Multimédia (loja online — migração de um catálogo de mais de 8.000 referências de Magento para WooCommerce, com as vendas a crescer mais de 50% depois da mudança); Monte Verde Gaming Fest (portal de um evento que recebeu mais de 100 mil visitas em quatro dias); Feira Medieval de Monte Verde (site multilingue de um dos eventos com maior afluência da região, com mais de 40 mil encaminhamentos para a compra de bilhetes).',
  '{}'::text[],
  array['portefolio', 'projetos', 'clientes', 'exemplos', 'casos-de-estudio', 'trabalhos-realizados', 'referencias'],
  true
),
(
  'Proteção de dados pessoais no formulário de contacto da Vértice Digital',
  'A Vértice Digital recolhe dados através do formulário de contacto do site exclusivamente para responder ao pedido e prestar os serviços solicitados. Não vende nem partilha dados pessoais com terceiros para fins de marketing sem consentimento explícito. O titular dos dados pode solicitar acesso, retificação ou eliminação dos seus dados a qualquer momento, enviando um email para geral@vertice-digital.example.',
  '{}'::text[],
  array['rgpd', 'privacidade', 'dados-pessoais', 'protecao-de-dados', 'formulario-de-contacto', 'gdpr'],
  true
),
(
  'Diferença entre site institucional e loja online — quando devo migrar',
  'Um site institucional apresenta a empresa, os serviços e os contactos, mas não vende diretamente online. Uma loja online (e-commerce) permite vender produtos ou serviços diretamente através do site, com carrinho de compras, pagamentos e gestão de encomendas — a Vértice Digital constrói-as em WooCommerce, com preço de referência a partir de 6.000€ (ver artigo sobre o serviço de Lojas Online). Quem pretende evoluir de site institucional para loja online pode pedir um orçamento através deste centro de apoio ou do formulário do site — resposta em 24 horas úteis.',
  '{}'::text[],
  array['institucional', 'ecommerce', 'migracao', 'precos'],
  true
)
on conflict (title) do update set
  content = excluded.content,
  site_type = excluded.site_type,
  tags = excluded.tags,
  is_published = excluded.is_published,
  updated_at = now();
