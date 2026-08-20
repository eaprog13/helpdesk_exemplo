-- NOTA (2026-08-20): site_type passou de valor único para array (ver
-- supabase/migration_tipos_site_multiplos.sql) — requer essa migração já
-- aplicada.
--
-- Dados de exemplo para a Base de Conhecimento (contexto do site da Vértice).
-- Opcional — útil para testar o fluxo de chat sem depender logo da LLM.
-- Substituir/expandir com o conteúdo real dos sites institucionais e lojas
-- online geridos pela Vértice.

insert into public.knowledge_base (title, content, site_type, tags) values
(
  'Como repor a password do painel de administração do site institucional',
  'Aceda a vertice-digital.example/admin/login e clique em "Esqueci-me da password". Introduza o email associado à conta. Receberá um email com um link válido por 30 minutos para definir uma nova password. Se não receber o email, verifique a pasta de spam ou contacte o apoio ao cliente.',
  array['institutional'],
  array['password', 'login', 'admin']
),
(
  'Como adicionar um novo produto na loja online',
  'No painel da loja, aceda a "Produtos" → "Adicionar novo". Preencha nome, descrição, preço, stock e carregue pelo menos uma imagem em formato JPG ou PNG (máx. 5MB). Clique em "Publicar" para o produto ficar visível na loja imediatamente, ou "Guardar rascunho" para publicar mais tarde.',
  array['ecommerce'],
  array['produtos', 'loja', 'catalogo']
),
(
  'Prazos de atualização de conteúdos do site institucional',
  'Pedidos de alteração de conteúdo (texto, imagens, páginas novas) enviados através deste centro de apoio são normalmente respondidos em 1 a 2 dias úteis. Alterações urgentes devem ser assinaladas com prioridade alta no ticket.',
  array['institutional'],
  array['prazos', 'conteudos', 'alteracoes']
),
(
  'Como consultar encomendas e faturação na loja online',
  'A secção "Encomendas" do painel mostra o histórico completo, estado de pagamento e de envio de cada encomenda. As faturas são geradas automaticamente e podem ser descarregadas em PDF a partir do detalhe de cada encomenda.',
  array['ecommerce'],
  array['encomendas', 'faturas', 'pagamentos']
);
