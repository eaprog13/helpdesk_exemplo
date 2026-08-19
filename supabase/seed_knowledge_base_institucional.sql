-- Base de Conhecimento — conteúdo extraído de https://vertice-digital.example/
-- Gerado a 2026-08-19. Duas secções:
--
--   1) FACTOS DO SITE — extraídos diretamente do JSON-LD e do conteúdo
--      renderizado (FAQ, serviços, portefólio, estatísticas, contactos) da
--      vertice-digital.example. Correspondem ao que está publicado no site, por
--      isso entram já com is_published = true.
--
--   2) CONTEXTOS DE SUPORTE SUGERIDOS — pertinentes para uma agência que
--      entrega sites institucionais e lojas online a clientes, seguindo o
--      padrão dos exemplos em seed.sql (reposição de password, gestão de
--      produtos, etc.). Estes NÃO vêm do site — foram propostos por mim
--      com base no tipo de negócio. Contêm suposições sobre processos
--      internos (prazos de SLA, gateways de pagamento, quem gere o
--      domínio, periodicidade de backups) marcadas com [REVER]. Ficam
--      is_published = false até serem confirmados/ajustados e publicados
--      manualmente no painel de admin (/admin/knowledge-base).
--
-- Como aplicar: colar no SQL Editor do Supabase, ou
--   psql "$DATABASE_URL" -f supabase/seed_knowledge_base_institucional.sql

-- ── 1) Factos do site vertice-digital.example ─────────────────────────────────

insert into public.knowledge_base (title, content, site_type, tags, is_published) values
(
  'O que é a Vértice Digital e que serviços oferece',
  'A Vértice Digital é uma agência digital sediada no Parque Empresarial de Monte Verde, Portugal, com o slogan "Ideias que ganham forma digital". Cria websites de alta conversão, lojas online (e-commerce), identidade de marca (branding), estratégias de marketing digital e automação de processos com Inteligência Artificial. Já entregou mais de 50 projetos, gerou mais de 1 milhão de euros para os seus clientes, mantém uma taxa de retenção de 98% e presta suporte 24 horas por dia, 7 dias por semana. Área de atuação: todo o Portugal, com foco em Monte Verde, Vale Fundo, Leiria e Lisboa.',
  'both',
  array['sobre', 'empresa', 'vertice-digital', 'servicos', 'quem-somos', 'agencia-digital', 'monte-verde', 'apresentacao'],
  true
),
(
  'Serviço de Web Development da Vértice Digital',
  'A Vértice Digital desenvolve websites de alta performance, otimizados para SEO e conversão, com design responsivo e abordagem mobile-first. Todos os websites incluem SEO técnico de raiz — dados estruturados, sitemap e metadados — e são otimizados para os Core Web Vitals, ficando preparados para serem encontrados tanto no Google como em motores de resposta com IA.',
  'institutional',
  array['web-development', 'websites', 'seo', 'servicos', 'criacao-de-sites', 'site-institucional', 'desenvolvimento-web', 'responsivo'],
  true
),
(
  'Serviço de E-Commerce (lojas online) da Vértice Digital',
  'A Vértice Digital desenvolve lojas online robustas e escaláveis, focadas na experiência do utilizador e na maximização das vendas 24 horas por dia, 7 dias por semana. Exemplos de lojas online já desenvolvidas: Horizonte Multimédia, Inês Duarte, Trilhos & Aventura e Linho Azul.',
  'ecommerce',
  array['ecommerce', 'loja-online', 'servicos', 'portefolio', 'lojas-online', 'vender-online', 'criar-loja', 'plataforma-de-vendas'],
  true
),
(
  'Serviço de Automação e Inteligência Artificial da Vértice Digital',
  'A Vértice Digital implementa agentes de IA e automações para otimizar processos, reduzir custos e aumentar a eficiência das empresas. Isto inclui agentes de IA para atendimento ao cliente, automação de tarefas repetitivas, integração entre ferramentas (CRM, email, faturação) e fluxos de trabalho inteligentes que libertam as equipas para trabalho de maior valor.',
  'both',
  array['automacao', 'ia', 'inteligencia-artificial', 'servicos', 'chatbot', 'agentes-ia', 'automatizacao', 'integracao-crm'],
  true
),
(
  'Serviço de Marketing Digital da Vértice Digital',
  'A Vértice Digital desenha estratégias de tráfego pago e orgânico com foco em ROI, para atrair e converter o público certo para o website ou loja online do cliente.',
  'both',
  array['marketing-digital', 'trafego', 'servicos', 'ads', 'google-ads', 'redes-sociais', 'publicidade'],
  true
),
(
  'Serviço de Branding da Vértice Digital',
  'A Vértice Digital cria identidade visual estratégica e memorável, que comunica os valores e a essência da marca do cliente — logótipo, paleta de cores, tipografia e restantes elementos de identidade.',
  'both',
  array['branding', 'identidade-visual', 'servicos', 'logotipo', 'design-grafico', 'marca', 'identidade-de-marca'],
  true
),
(
  'Quanto tempo demora a desenvolver um projeto com a Vértice Digital',
  'Um website institucional fica normalmente pronto em 2 a 4 semanas. Lojas online e projetos com automação ou IA demoram entre 4 a 8 semanas, dependendo dos requisitos. A Vértice Digital define prazos claros no início do projeto e acompanha o cliente em todas as fases.',
  'both',
  array['prazos', 'processo', 'faq', 'quanto-tempo', 'tempo-de-entrega', 'duracao', 'prazo-de-entrega'],
  true
),
(
  'Os websites da Vértice Digital são otimizados para SEO e telemóvel',
  'Sim. Todos os websites da Vértice Digital são desenvolvidos mobile-first, com performance otimizada (Core Web Vitals), SEO técnico incluído de raiz — dados estruturados, sitemap, metadados — e preparados para serem encontrados tanto no Google como em motores de resposta com IA.',
  'both',
  array['seo', 'mobile', 'faq', 'telemovel', 'responsivo', 'core-web-vitals', 'posicionamento-google'],
  true
),
(
  'Como contactar a Vértice Digital',
  'Email: hello@vertice-digital.example. Telefone: +351 900 000 853. Morada: Parque Empresarial de Monte Verde, Monte Verde, Portugal. A Vértice Digital também está presente no Instagram (@verticedigital) e no LinkedIn (Vértice Digital — Agência Digital).',
  'both',
  array['contactos', 'apoio', 'morada', 'telefone', 'email', 'localizacao', 'falar-com-a-equipa'],
  true
),
(
  'Portefólio de projetos da Vértice Digital',
  'Alguns projetos desenvolvidos pela Vértice Digital: Horizonte Multimédia (loja online), Feira Medieval de Monte Verde (website institucional), Monte Verde Gaming Fest (website de evento), Atelier Clara (website de estúdio), Inês Duarte (loja online), Trilhos & Aventura (loja online), Linho Azul (loja online) e Lua (aplicação móvel para Android e iOS, desenvolvida em .NET MAUI).',
  'both',
  array['portefolio', 'projetos', 'clientes', 'exemplos', 'casos-de-estudio', 'trabalhos-realizados', 'referencias'],
  true
),
(
  'Proteção de dados pessoais no formulário de contacto da Vértice Digital',
  'A Vértice Digital recolhe dados através do formulário de contacto do site (nome, email, telefone e empresa) exclusivamente para responder ao pedido de contacto e prestar os serviços solicitados. Não vende nem partilha dados pessoais com terceiros para fins de marketing sem consentimento explícito. O titular dos dados pode solicitar acesso, retificação ou eliminação dos seus dados a qualquer momento, enviando um email para hello@vertice-digital.example.',
  'both',
  array['rgpd', 'privacidade', 'dados-pessoais', 'protecao-de-dados', 'formulario-de-contacto', 'gdpr'],
  true
);

-- ── 2) Contextos de suporte sugeridos (rever antes de publicar) ────────
-- Conteúdo assumido/genérico, não confirmado pela Vértice Digital. Rever os
-- pontos marcados [REVER] e só depois mudar is_published para true.

insert into public.knowledge_base (title, content, site_type, tags, is_published) values
(
  'Como pedir alterações de conteúdo ou design depois do site estar no ar',
  '[REVER] Pedidos de alteração de conteúdo, imagens ou pequenos ajustos de design devem ser submetidos através deste centro de apoio, indicando claramente a página e a alteração pretendida. Alterações simples são normalmente feitas em 1 a 2 dias úteis; alterações mais complexas (novas páginas, novas funcionalidades) podem exigir orçamento à parte — confirmar prazos reais e se existe um plano de manutenção com um número de horas incluídas.',
  'both',
  array['rascunho', 'alteracoes', 'manutencao', 'suporte'],
  false
),
(
  'Quem trata do domínio e do alojamento (hosting) do meu site',
  '[REVER] A gestão de domínio e alojamento pode ser feita pela Vértice Digital em nome do cliente ou diretamente pelo cliente, consoante o que ficou definido no contrato/orçamento. Para saber quem é responsável pela renovação anual do domínio e do alojamento, consulte a proposta/contrato assinado ou contacte o apoio ao cliente — confirmar processo real e quem emite os avisos de renovação.',
  'both',
  array['rascunho', 'dominio', 'hosting', 'alojamento'],
  false
),
(
  'O meu site tem certificado SSL (HTTPS)',
  '[REVER] Os websites e lojas online desenvolvidos pela Vértice Digital são normalmente entregues com certificado SSL ativo (HTTPS), garantindo ligação segura e sendo um requisito para SEO e para plataformas de pagamento — confirmar processo de renovação do certificado e quem é responsável por ele.',
  'both',
  array['rascunho', 'ssl', 'https', 'seguranca'],
  false
),
(
  'O meu site tem cópias de segurança (backups)',
  '[REVER] Consultar o plano de manutenção contratado para confirmar a periodicidade dos backups (diários/semanais) e durante quanto tempo são guardados. Em caso de necessidade de restauro, contactar o apoio ao cliente através deste centro de apoio.',
  'both',
  array['rascunho', 'backups', 'seguranca'],
  false
),
(
  'O que está incluído no suporte e manutenção pós-lançamento',
  '[REVER] Consoante o plano contratado, o suporte pós-lançamento pode incluir: monitorização de disponibilidade (uptime), atualizações de segurança, pequenas alterações de conteúdo e apoio técnico através deste centro de apoio. Para alterações estruturais (novas páginas, novas funcionalidades) pode ser necessário um orçamento adicional — confirmar o que cada plano inclui de facto.',
  'both',
  array['rascunho', 'manutencao', 'suporte', 'planos'],
  false
),
(
  'Que métodos de pagamento posso ativar na minha loja online',
  '[REVER] As lojas online desenvolvidas pela Vértice Digital podem ser configuradas com múltiplos métodos de pagamento (por exemplo: cartão de crédito/débito, Multibanco, MB WAY, transferência bancária), consoante o gateway de pagamento contratado. Para ativar ou alterar métodos de pagamento, contactar o apoio ao cliente — confirmar quais os gateways realmente suportados.',
  'ecommerce',
  array['rascunho', 'pagamentos', 'ecommerce'],
  false
),
(
  'Como configurar portes e zonas de envio na loja online',
  '[REVER] A configuração de portes de envio (valor fixo, gratuito a partir de um valor mínimo, ou por transportadora) é normalmente feita na secção de definições de envio do painel da loja. Para alterar zonas de envio ou tabelas de preços, contactar o apoio ao cliente — confirmar nome real dessa secção no painel usado pela Vértice Digital.',
  'ecommerce',
  array['rascunho', 'envios', 'portes', 'ecommerce'],
  false
),
(
  'Vários utilizadores podem aceder ao painel de administração do site',
  '[REVER] Consoante o plano contratado, pode ser possível criar acessos adicionais ao painel de administração para diferentes membros da equipa, com permissões distintas. Para pedir um novo acesso, contactar o apoio ao cliente indicando o nome e email da pessoa — confirmar se esta funcionalidade existe de facto e quais os limites por plano.',
  'both',
  array['rascunho', 'utilizadores', 'permissoes', 'admin'],
  false
),
(
  'O meu site cumpre o RGPD (cookies, formulários e consentimento)',
  '[REVER] Os websites desenvolvidos pela Vértice Digital incluem, por norma, banner de consentimento de cookies e política de privacidade. A conformidade total com o RGPD (registo de consentimentos, retenção de dados, etc.) depende também dos processos internos do cliente. Para rever a configuração de RGPD do site, contactar o apoio ao cliente — confirmar o que é entregue por defeito em cada projeto.',
  'both',
  array['rascunho', 'rgpd', 'cookies', 'privacidade'],
  false
),
(
  'Como reportar um erro (bug) no meu site ou loja online',
  'Para reportar um erro, abrir um novo pedido neste centro de apoio descrevendo: (1) o que estava a tentar fazer, (2) o que aconteceu em vez do esperado, e (3) se possível, uma captura de ecrã e o link da página. Isto acelera a resolução por parte da equipa técnica da Vértice Digital.',
  'both',
  array['bug', 'erro', 'suporte-tecnico'],
  false
),
(
  'Diferença entre site institucional e loja online — quando devo migrar',
  'Um site institucional apresenta a empresa, os serviços e os contactos, mas não vende diretamente online. Uma loja online (e-commerce) permite vender produtos ou serviços diretamente através do site, com carrinho de compras, pagamentos e gestão de encomendas. Quem pretende começar a vender online pode pedir à Vértice Digital um orçamento para evoluir o site institucional para uma loja online.',
  'both',
  array['institucional', 'ecommerce', 'migracao'],
  false
);
