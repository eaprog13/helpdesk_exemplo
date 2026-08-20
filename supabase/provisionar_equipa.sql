-- Provisionar a equipa (admins + devs por departamento). Gerado a 2026-08-20.
--
-- Passo 1 — para CADA linha abaixo, criar a conta em:
--   Supabase → Authentication → Users → Add user
--   (email + password à escolha; não é preciso "Auto Confirm User" marcado
--   se preferires que a pessoa confirme o email, mas sem isso o login não
--   funciona antes de confirmar — mais simples marcar "Auto Confirm User")
--
-- Passo 2 — copiar o UUID de cada utilizador criado (coluna "UID" na
-- lista de Authentication → Users) para o "<uuid-...>" correspondente
-- abaixo, e correr este ficheiro completo no SQL Editor.
--
-- Nota: isto só faz UPDATE — o trigger "handle_new_user" (schema.sql) já
-- cria a linha em public.profiles automaticamente quando a conta nasce em
-- Authentication (com role='client' por omissão); estas linhas corrigem
-- role/department/nome a seguir a isso.
--
-- Requer supabase/migration_adicionar_departamentos.sql já aplicada
-- (as colunas department não existem antes disso).

-- Manel — admin, sem departamento de dev associado (é quem gere a equipa).
update public.profiles set
  role = 'admin',
  full_name = 'Emanuel Santos Aleluia',
  department = '{}'
where id = '<uuid-admin>';

-- Ricardo — admin E também candidato à atribuição automática de
-- Desenvolvimento (role='admin' não o exclui de listarEquipa()).
update public.profiles set
  role = 'admin',
  full_name = 'Ricardo Fonseca',
  department = array['desenvolvimento']
where id = '<uuid-admin-dev>';

-- Tiago — Desenvolvimento.
update public.profiles set
  role = 'dev',
  full_name = 'Tiago Fonseca',
  department = array['desenvolvimento']
where id = '<uuid-dev-desenvolvimento>';

-- Beatriz — Marketing Digital E Branding/Design (os dois departamentos,
-- array com mais do que um valor — ver comentário em schema.sql).
update public.profiles set
  role = 'dev',
  full_name = 'Beatriz',
  department = array['marketing', 'design']
where id = '<uuid-dev-marketing-design>';

-- geral@vertice-digital.example — departamento "Geral". Não é candidato à
-- atribuição AUTOMÁTICA (ver escolherDevPorMenorCarga em
-- core/services/ticketService.ts — "geral" está excluído de propósito);
-- aparece no seletor manual "Dev responsável" quando um admin triar um
-- ticket "Por triar" para Geral, para escolher à mão.
update public.profiles set
  role = 'dev',
  full_name = 'Apoio Geral',
  department = array['geral']
where id = '<uuid-dev-geral>';

-- Verificação rápida — deve devolver as 5 linhas acima já corrigidas:
select id, full_name, role, department from public.profiles where role in ('admin', 'dev') order by full_name;
