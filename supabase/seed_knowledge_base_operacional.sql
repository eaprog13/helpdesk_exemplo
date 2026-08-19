-- Base de Conhecimento — contexto operacional do dia a dia do cliente
-- Gerado a 2026-08-19. Complementa seed_knowledge_base_institucional.sql:
-- aquele cobre FACTOS DO SITE (quem é a Vértice, serviços, portefólio) —
-- conteúdo de marketing/institucional. Este cobre o dia a dia real de quem
-- já é cliente e tem um site institucional ou loja online em produção:
-- problemas de pagamento, acesso, alterações, funcionalidades novas, site
-- partido/em baixo, atualizações e dúvidas comuns.
--
-- Motivo: testado diretamente ("tenho um problema com a minha loja
-- online") — sem nenhum artigo operacional, a pesquisa devolvia o artigo
-- de VENDAS "Serviço de E-Commerce da Vértice Digital" (rank 0.55, o mais
-- alto disponível) em vez de ajuda real, porque não havia nada mais
-- relevante na KB — não é um bug de pesquisa, é uma lacuna de conteúdo.
--
-- Duas categorias:
--   1) GUIAS OPERACIONAIS — factos genéricos, seguros (não comprometem a
--      Vértice Digital com nenhum processo/prazo não confirmado). Entram já
--      is_published = true.
--   2) POLÍTICAS/PROCESSOS INTERNOS — dependem de decisões da Vértice
--      Digital não confirmadas aqui (horário de apoio, SLA de resposta,
--      cadência de atualizações, processo de orçamentação de
--      funcionalidades novas). Marcados [REVER], is_published = false —
--      rever e publicar manualmente em /admin/knowledge-base depois de
--      confirmar os factos reais.
--
-- Como aplicar: colar no SQL Editor do Supabase e correr. Idempotente
-- (on conflict (title) do nothing) — seguro correr mais do que uma vez.

-- ── 1) Guias operacionais (factos genéricos, seguros) ───────────────────

insert into public.knowledge_base (title, content, site_type, tags, is_published) values
(
  'O meu site ou loja online parece estar em baixo',
  'Antes de reportar, confirme que não é um problema local: tente aceder a partir de outro dispositivo, rede (por exemplo dados móveis em vez de wifi) ou browser, e verifique se outros sites abrem normalmente a partir da sua ligação. Se o problema persistir — página de erro, ecrã em branco, ou o site não carrega de todo — reporte através deste centro de apoio com a hora exata em que reparou no problema e, se possível, uma captura de ecrã do erro. Isto ajuda a nossa equipa a diagnosticar mais depressa se é um problema no site, no alojamento ou no domínio.',
  'both',
  array['site-em-baixo', 'loja-em-baixo', 'indisponivel', 'offline', 'nao-carrega', 'erro-500', 'pagina-em-branco', 'downtime', 'site-nao-abre'],
  true
),
(
  'Problema de pagamento na loja online',
  'Se um cliente reportou que o pagamento falhou, foi recusado ou ficou "pendente": confirme primeiro se a encomenda aparece no painel de gestão da loja e qual o estado do pagamento associado. Problemas comuns incluem dados do cartão incorretos, limite insuficiente, ou uma indisponibilidade momentânea do meio de pagamento (Multibanco, MB Way, cartão). Se o pagamento aparece confirmado do lado do meio de pagamento mas a encomenda não ficou registada na loja (ou vice-versa), reporte através deste centro de apoio com o número da encomenda, a data/hora e o meio de pagamento usado, para a nossa equipa investigar a integração.',
  'ecommerce',
  array['pagamento', 'problema-pagamento', 'pagamento-recusado', 'cartao-recusado', 'multibanco', 'mbway', 'checkout', 'encomenda-nao-registada', 'reembolso', 'pagamento-pendente'],
  true
),
(
  'Não consigo entrar no painel de administração do meu site ou loja',
  'Para além de password esquecida (ver artigo específico sobre repor a password), outras causas comuns de não conseguir entrar: o email introduzido não é exatamente o mesmo com que a conta foi criada (verifique maiúsculas/minúsculas e domínio do email), a conta ainda não foi ativada, ou o utilizador foi removido/desativado por um administrador da sua empresa. Se continuar sem conseguir aceder depois de confirmar estes pontos, contacte o apoio ao cliente indicando o email com que costuma entrar — não confirme nem partilhe a sua password por email ou chat.',
  'both',
  array['acesso', 'nao-consigo-entrar', 'login', 'painel-administracao', 'conta-bloqueada', 'back-office', 'utilizador-removido', 'admin'],
  true
),
(
  'Os visitantes ou clientes da minha loja dizem que não conseguem aceder ao site',
  'Isto é diferente de não conseguir entrar no painel de administração — aqui é o site público (a loja ou o site institucional) que não abre para quem o visita, não o acesso de gestão. Peça ao visitante, se possível, uma captura de ecrã do erro e o dispositivo/browser usado — muitas vezes é um problema pontual de rede do próprio visitante. Se vários visitantes reportarem o mesmo problema ao mesmo tempo, ou se o site também não abrir para si a partir de uma rede diferente, é provável que seja uma indisponibilidade real — reporte de imediato através deste centro de apoio (ver também "O meu site ou loja online parece estar em baixo").',
  'both',
  array['clientes-nao-acedem', 'visitantes', 'site-publico', 'loja-inacessivel', 'reclamacao-de-cliente', 'nao-abre-para-visitantes'],
  true
),
(
  'Como altero textos, imagens ou informações simples no meu site ou loja',
  'Alterações simples de conteúdo — texto, imagens, preços, informações de contacto — podem normalmente ser feitas diretamente no painel de administração do seu site ou loja, sem precisar de pedir à Vértice Digital. Se não tiver a certeza de como editar uma secção específica, ou se a alteração for mais complexa (nova página, nova secção, alteração de estrutura ou design), peça através deste centro de apoio — ver "Como pedir alterações de conteúdo ou design depois do site estar no ar" para o que está incluído e prazos habituais.',
  'both',
  array['alterar-conteudo', 'editar-texto', 'editar-imagens', 'back-office', 'autogestao', 'como-editar', 'mudar-precos'],
  true
),
(
  'Uma parte do meu site ou loja parece partida ou com erro',
  'Exemplos: uma imagem não aparece, um botão não funciona, o layout está desalinhado, ou aparece uma mensagem de erro numa página específica. Antes de reportar, tente recarregar a página (Ctrl+F5 ou Cmd+Shift+R, para ignorar a versão em cache do browser) e testar noutro browser, para confirmar que não é algo só do seu computador. Ao reportar, indique o URL exato da página, o que esperava ver e o que aparece em vez disso, e junte uma captura de ecrã — isto acelera muito a correção.',
  'both',
  array['bug', 'erro', 'site-partido', 'elemento-partido', 'imagem-nao-aparece', 'botao-nao-funciona', 'layout-desalinhado', 'reportar-erro'],
  true
),
(
  'Notificações de encomendas ou contacto não chegam por email',
  'Primeiro, verifique a pasta de spam/lixo eletrónico e, se usar filtros de email, confirme que não está a bloquear mensagens automáticas. Verifique também se o email configurado para receber notificações no painel de administração está correto e ativo. Se tudo isto estiver certo e as notificações continuarem a não chegar, contacte o apoio ao cliente indicando o email configurado e um exemplo de encomenda ou contacto que não gerou notificação, para a nossa equipa verificar o envio.',
  'both',
  array['notificacoes', 'email-nao-chega', 'encomenda-sem-email', 'formulario-de-contacto', 'spam', 'alertas-por-email'],
  true
),
(
  'O meu site ou loja está lento',
  'Antes de reportar lentidão, confirme se acontece em páginas específicas ou em todo o site, e se acontece consigo apenas ou também com outras pessoas — muitas vezes a causa é a ligação à internet do próprio visitante, não o site. Imagens muito grandes carregadas recentemente no painel de administração também podem tornar páginas mais lentas a abrir. Se a lentidão for geral e persistente, reporte através deste centro de apoio indicando as páginas afetadas e, se possível, a que horas notou o problema.',
  'both',
  array['lentidao', 'site-lento', 'loja-lenta', 'performance', 'demora-a-carregar', 'velocidade'],
  true
),
(
  -- Entrada de triagem para perguntas totalmente genéricas ("tenho um
  -- problema com a minha loja online", sem nenhum detalhe). Sem isto, o
  -- artigo de MARKETING "Serviço de E-Commerce" ganhava por ter "loja
  -- online" concentrado num título curto — nenhum artigo específico deve
  -- responder com confiança a uma pergunta tão vaga; esta entrada existe
  -- para pedir mais detalhe, com um título próximo da frase real do
  -- cliente para ganhar por correspondência direta.
  'Tenho um problema com o meu site ou loja',
  'Para ajudarmos mais depressa, descreva o que está a acontecer com mais detalhe: é um problema de pagamento, não consegue aceder ao painel de administração, os seus clientes não conseguem abrir o site, o site ou loja parece estar em baixo ou lento, ou há algo que parece partido ou com erro numa página? Cada uma destas situações tem passos próprios de diagnóstico neste centro de apoio — quanto mais específico for, mais rápido conseguimos ajudar.',
  'both',
  array['problema', 'ajuda', 'suporte', 'duvida', 'nao-sei-o-que-e', 'triagem', 'algo-errado'],
  true
)
on conflict (title) do nothing;


-- ── 2) Políticas/processos internos (por confirmar antes de publicar) ──

insert into public.knowledge_base (title, content, site_type, tags, is_published) values
(
  'Pedido de funcionalidade nova no site ou loja',
  '[REVER] Pedidos de funcionalidades novas — por exemplo um novo método de pagamento, um filtro de produtos, integração com outra ferramenta, ou uma área nova do site — são tratados como um pedido de desenvolvimento, diferente de uma alteração simples de conteúdo. Descreva através deste centro de apoio o que pretende e para que serve; a nossa equipa avalia a viabilidade e prepara uma proposta de prazo e, se aplicável, orçamento, antes de iniciar o trabalho — confirmar processo exato e se há um limiar de horas incluído no plano de manutenção antes de publicar.',
  'both',
  array['nova-funcionalidade', 'feature-nova', 'desenvolvimento', 'orcamento', 'pedido-de-desenvolvimento', 'integracao'],
  false
),
(
  'Frequência de atualizações do site ou loja',
  '[REVER] O site ou loja pode precisar de atualizações técnicas periódicas (segurança, plataforma, dependências) para continuar a funcionar de forma estável e segura — confirmar cadência real, se o cliente é notificado antecipadamente, se há uma janela de manutenção preferencial, e se atualizações podem causar indisponibilidade temporária, antes de publicar.',
  'both',
  array['atualizacoes', 'updates', 'manutencao', 'janela-de-manutencao', 'seguranca'],
  false
),
(
  'Qual é o horário e os canais de apoio da Vértice Digital',
  '[REVER] Confirmar horário real de atendimento, tempo médio/máximo de resposta esperado por prioridade (ex.: site em baixo vs. dúvida simples), e se existe algum canal de emergência fora deste centro de apoio, antes de publicar — evitar publicar um compromisso de tempo de resposta que não esteja confirmado internamente.',
  'both',
  array['horario-de-apoio', 'sla', 'tempo-de-resposta', 'canais-de-suporte', 'emergencia'],
  false
)
on conflict (title) do nothing;
