-- NOTA (2026-08-20): site_type passou de valor único para array (ver
-- supabase/migration_tipos_site_multiplos.sql) — requer essa migração já
-- aplicada. 'both' deixou de existir; array vazio '{}' = artigo genérico,
-- aplica-se a todos os tipos de site/produto.
--
-- Base de Conhecimento — conteúdo extraído de https://vertice-digital.example/
-- (site institucional real da Vértice Digital). Revisto/atualizado a
-- 2026-08-20: o conteúdo abaixo já não é o mesmo da primeira versão deste
-- ficheiro — o site publicado hoje descreve uma agência diferente em vários
-- pontos (email, telefone, morada, equipa, portefólio, preços) do que
-- tinha sido lido da primeira vez. Quem já correu a versão antiga deste
-- seed TEM de aplicar também
-- supabase/migration_atualizar_kb_institucional.sql (ver README) — este
-- ficheiro sozinho, por usar "on conflict (title) do nothing", não
-- corrige entradas já existentes na base de dados com os factos antigos.
--
-- Duas secções:
--
--   1) FACTOS DO SITE — extraídos do conteúdo publicado (páginas
--      Serviços, Websites, Lojas online, Marketing digital, Branding,
--      Sobre, Contactos, Trabalhos) de vertice-digital.example.
--      Correspondem ao que está publicado no site, por isso entram já com
--      is_published = true.
--
--   2) CONTEXTOS DE SUPORTE SUGERIDOS — pertinentes para uma agência que
--      entrega sites institucionais e lojas online a clientes, seguindo o
--      padrão dos exemplos em seed.sql (reposição de password, gestão de
--      produtos, etc.). Estes NÃO vêm do site — foram propostos por mim
--      com base no tipo de negócio. Contêm suposições sobre processos
--      internos (SLA de suporte pós-lançamento, gateways de pagamento,
--      quem gere o domínio, periodicidade de backups) marcadas com
--      [REVER]. Ficam is_published = false até serem confirmados/
--      ajustados e publicados manualmente no painel de admin
--      (/admin/knowledge-base).
--
-- Como aplicar: colar no SQL Editor do Supabase, ou
--   psql "$DATABASE_URL" -f supabase/seed_knowledge_base_institucional.sql

-- ── 1) Factos do site vertice-digital.example ─────────────────

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
) on conflict (title) do nothing;

-- ── 2) Contextos de suporte sugeridos (rever antes de publicar) ────────
-- Conteúdo assumido/genérico, não confirmado pela Vértice Digital. Rever os
-- pontos marcados [REVER] e só depois mudar is_published para true.

insert into public.knowledge_base (title, content, site_type, tags, is_published) values
(
  'Como pedir alterações de conteúdo ou design depois do site estar no ar',
  '[REVER] Pedidos de alteração de conteúdo, imagens ou pequenos ajustos de design devem ser submetidos através deste centro de apoio, indicando claramente a página e a alteração pretendida. Alterações simples são normalmente feitas em 1 a 2 dias úteis; alterações mais complexas (novas páginas, novas funcionalidades) podem exigir orçamento à parte — confirmar prazos reais e se existe um plano de manutenção com um número de horas incluídas.',
  '{}'::text[],
  array['rascunho', 'alteracoes', 'manutencao', 'suporte'],
  false
),
(
  'Quem trata do domínio e do alojamento (hosting) do meu site',
  '[REVER] A gestão de domínio e alojamento pode ser feita pela Vértice Digital em nome do cliente ou diretamente pelo cliente, consoante o que ficou definido no contrato/orçamento. O serviço de Websites já inclui alojamento com backups e monitorização (ver artigo sobre o serviço de Websites) — confirmar se isso cobre também a renovação anual do domínio, e quem emite os avisos de renovação.',
  '{}'::text[],
  array['rascunho', 'dominio', 'hosting', 'alojamento'],
  false
),
(
  'O meu site tem certificado SSL (HTTPS)',
  '[REVER] Os websites e lojas online desenvolvidos pela Vértice Digital são normalmente entregues com certificado SSL ativo (HTTPS), garantindo ligação segura e sendo um requisito para SEO e para plataformas de pagamento — confirmar processo de renovação do certificado e quem é responsável por ele.',
  '{}'::text[],
  array['rascunho', 'ssl', 'https', 'seguranca'],
  false
),
(
  'O meu site tem cópias de segurança (backups)',
  '[REVER] O serviço de Websites inclui alojamento com backups e monitorização (ver artigo sobre o serviço de Websites) — confirmar periodicidade exata (diária/semanal) e durante quanto tempo os backups ficam guardados. Em caso de necessidade de restauro, contactar o apoio ao cliente através deste centro de apoio.',
  '{}'::text[],
  array['rascunho', 'backups', 'seguranca'],
  false
),
(
  'O que está incluído no suporte e manutenção pós-lançamento',
  '[REVER] O serviço de Websites inclui, por defeito, 30 dias de acompanhamento pós-lançamento (ver artigo sobre o serviço de Websites). Depois desse período, e consoante o plano contratado, o suporte pode incluir monitorização de disponibilidade, atualizações de segurança, pequenas alterações de conteúdo e apoio técnico através deste centro de apoio — para alterações estruturais pode ser necessário orçamento adicional. Confirmar o que cada plano inclui de facto depois dos 30 dias iniciais.',
  '{}'::text[],
  array['rascunho', 'manutencao', 'suporte', 'planos'],
  false
),
(
  'Que métodos de pagamento posso ativar na minha loja online',
  '[REVER] As lojas online da Vértice Digital são construídas em WooCommerce, com checkout otimizado e métodos de pagamento nacionais (ver artigo sobre o serviço de Lojas Online) — confirmar a lista exata de gateways/métodos suportados (ex.: cartão, Multibanco, MB WAY, transferência bancária) para responder com precisão.',
  array['ecommerce'],
  array['rascunho', 'pagamentos', 'ecommerce', 'woocommerce'],
  false
),
(
  'Como configurar portes e zonas de envio na loja online',
  '[REVER] A configuração de portes de envio (valor fixo, gratuito a partir de um valor mínimo, ou por transportadora) é normalmente feita na secção de definições de envio do painel WooCommerce da loja. Para alterar zonas de envio ou tabelas de preços, contactar o apoio ao cliente — confirmar nome exato dessa secção e transportadoras já integradas.',
  array['ecommerce'],
  array['rascunho', 'envios', 'portes', 'ecommerce'],
  false
),
(
  'Vários utilizadores podem aceder ao painel de administração do site',
  '[REVER] Consoante o plano contratado, pode ser possível criar acessos adicionais ao painel de administração para diferentes membros da equipa, com permissões distintas. Para pedir um novo acesso, contactar o apoio ao cliente indicando o nome e email da pessoa — confirmar se esta funcionalidade existe de facto e quais os limites por plano.',
  '{}'::text[],
  array['rascunho', 'utilizadores', 'permissoes', 'admin'],
  false
),
(
  'O meu site cumpre o RGPD (cookies, formulários e consentimento)',
  '[REVER] Os websites desenvolvidos pela Vértice Digital incluem, por norma, banner de consentimento de cookies e política de privacidade. A conformidade total com o RGPD (registo de consentimentos, retenção de dados, etc.) depende também dos processos internos do cliente. Para rever a configuração de RGPD do site, contactar o apoio ao cliente — confirmar o que é entregue por defeito em cada projeto.',
  '{}'::text[],
  array['rascunho', 'rgpd', 'cookies', 'privacidade'],
  false
),
(
  'Como reportar um erro (bug) no meu site ou loja online',
  'Para reportar um erro, abrir um novo pedido neste centro de apoio descrevendo: (1) o que estava a tentar fazer, (2) o que aconteceu em vez do esperado, e (3) se possível, uma captura de ecrã e o link da página. Isto acelera a resolução por parte da equipa técnica da Vértice Digital.',
  '{}'::text[],
  array['bug', 'erro', 'suporte-tecnico'],
  false
),
(
  'Diferença entre site institucional e loja online — quando devo migrar',
  'Um site institucional apresenta a empresa, os serviços e os contactos, mas não vende diretamente online. Uma loja online (e-commerce) permite vender produtos ou serviços diretamente através do site, com carrinho de compras, pagamentos e gestão de encomendas — a Vértice Digital constrói-as em WooCommerce, com preço de referência a partir de 6.000€ (ver artigo sobre o serviço de Lojas Online). Quem pretende evoluir de site institucional para loja online pode pedir um orçamento através deste centro de apoio ou do formulário do site — resposta em 24 horas úteis.',
  '{}'::text[],
  array['institucional', 'ecommerce', 'migracao', 'precos'],
  true
) on conflict (title) do nothing;

-- ── 3) Departamento de cada artigo acima (ver migration_adicionar_departamentos.sql) ──
-- "where department is null" — nunca pisa uma classificação já ajustada
-- manualmente por um admin. Idempotente.
update public.knowledge_base set department = 'desenvolvimento' where department is null and title in (
  'O que é a Vértice Digital e que serviços oferece',
  'Serviço de Websites da Vértice Digital',
  'Serviço de Lojas Online (E-commerce) da Vértice Digital',
  'Desenvolvimento de software e aplicações personalizadas da Vértice Digital',
  'Os websites da Vértice Digital são otimizados para SEO e telemóvel',
  'Diferença entre site institucional e loja online — quando devo migrar'
);
update public.knowledge_base set department = 'marketing' where department is null and title = 'Serviço de Marketing Digital da Vértice Digital';
update public.knowledge_base set department = 'design' where department is null and title = 'Serviço de Branding da Vértice Digital';
update public.knowledge_base set department = 'geral' where department is null and title in (
  'Como funciona o processo de um projeto com a Vértice Digital',
  'Quanto tempo demora um orçamento e um projeto com a Vértice Digital',
  'Quanto custam os serviços da Vértice Digital',
  'Quem é a equipa da Vértice Digital',
  'Como contactar a Vértice Digital',
  'Portefólio de projetos da Vértice Digital',
  'Proteção de dados pessoais no formulário de contacto da Vértice Digital'
);
