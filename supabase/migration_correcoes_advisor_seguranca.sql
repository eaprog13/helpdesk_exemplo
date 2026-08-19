-- ════════════════════════════════════════════════════════════════════════
-- Correções aos 16 avisos do Security Advisor do Supabase (agosto 2026) +
-- 1 falha de controlo de acesso encontrada à parte, a ler policies.sql
-- (ver secção 3).
--
-- Correr no SQL Editor do Supabase, depois de schema.sql + policies.sql já
-- aplicados. É seguro correr mais do que uma vez (idempotente): todos os
-- "drop ... if exists" e "create or replace" garantem isso.
--
-- Não apaga nem altera nenhuma linha de dados — só definições de funções,
-- grants (permissões) e policies (RLS).
-- ════════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════
-- 1. FUNCTION SEARCH PATH MUTABLE (7 funções)
-- ══════════════════════════════════════════════════════════════════════
-- Sem "search_path" fixo, uma função pode resolver um nome não qualificado
-- (ex.: chamar "to_tsvector(...)" sem prefixo de schema) para um objeto
-- diferente do esperado, caso alguém consiga criar um objeto com esse
-- nome noutro schema que apareça primeiro no search_path da sessão —
-- risco maior em funções SECURITY DEFINER (correm com privilégios do
-- dono), mas o Advisor recomenda fixar em todas.
--
-- "public.current_role_is" e "public.handle_new_user" já tinham
-- "set search_path = public" (ver policies.sql / schema.sql) — não
-- precisam de correção aqui, só aparecem mais abaixo (secção 2) pelo
-- motivo de exposição via RPC, que é um problema diferente.

alter function public.imm_to_tsvector(configuracao text, conteudo text) set search_path = public;
alter function public.imm_array_to_string(elementos text[], separador text) set search_path = public;
alter function public.tsquery_termos(query_text text) set search_path = public;
alter function public.tsquery_or_sfunc(estado tsquery, elemento tsquery) set search_path = public;
alter function public.search_knowledge_base(text, text, int) set search_path = public;
alter function public.search_client_history(uuid, text, int) set search_path = public;
alter function public.set_updated_at() set search_path = public;

-- Nota sobre "tsquery_or_agg": o Advisor lista-a como função com
-- search_path mutável, mas é um AGREGADO (create aggregate), e o Postgres
-- não tem "alter aggregate ... set search_path" — um agregado não executa
-- SQL próprio, só despacha para a sua "sfunc" (tsquery_or_sfunc, já
-- corrigida acima). Corrigir a sfunc fecha o risco real; este aviso
-- específico deve desaparecer do Advisor por associação, mas se persistir
-- é uma limitação conhecida do linter para agregados, não um problema por
-- resolver aqui.


-- ══════════════════════════════════════════════════════════════════════
-- 2. FUNÇÕES SECURITY DEFINER CHAMÁVEIS DIRETAMENTE POR anon/authenticated
-- ══════════════════════════════════════════════════════════════════════
-- Toda função criada em "public" fica, por omissão do Postgres, com
-- EXECUTE concedido a PUBLIC — e por isso chamável via
-- /rest/v1/rpc/<nome> por qualquer pessoa com a anon key, mesmo sem
-- sessão. Para funções SECURITY DEFINER isto é mais sensível (correm com
-- privilégios do dono, não de quem chama). As três abaixo nunca foram
-- pensadas para serem chamadas diretamente pelo browser — são auxiliares
-- internas (usadas dentro de policies) ou funções de trigger.

-- current_role_is: continua a precisar de EXECUTE para "authenticated",
-- porque é chamada dentro de várias policies RLS avaliadas para esse
-- papel (ver secção 3) — só se fecha o acesso direto via RPC e o acesso
-- por "anon".
revoke execute on function public.current_role_is(roles text[]) from public;
grant execute on function public.current_role_is(roles text[]) to authenticated;

-- handle_new_user: só é invocada pelo trigger "on_auth_user_created" (ver
-- schema.sql) — a execução de uma função de trigger não depende de a
-- sessão que despoletou o INSERT ter EXECUTE sobre ela, por isso pode
-- perder o grant a PUBLIC sem quebrar o registo de novos utilizadores.
revoke execute on function public.handle_new_user() from public;

-- rls_auto_enable: existe na tua base de dados (o Advisor viu-a), mas
-- NÃO está em nenhum ficheiro deste repositório — foi criada a espaço,
-- diretamente na dashboard/SQL Editor, nalgum momento não documentado.
-- Estou a fechar o acesso via RPC por segurança, mas vale a pena
-- confirmares o que faz e se ainda é precisa:
--   select pg_get_functiondef('public.rls_auto_enable()'::regprocedure);
-- Se for um resquício sem uso (ex.: um teste antigo para ativar RLS
-- automaticamente em tabelas novas), o mais limpo é remover de vez:
--   drop function public.rls_auto_enable();
revoke execute on function public.rls_auto_enable() from public;


-- ══════════════════════════════════════════════════════════════════════
-- 3. FALHA DE CONTROLO DE ACESSO — policies sem "to authenticated"
-- ══════════════════════════════════════════════════════════════════════
-- Nenhuma policy em policies.sql tinha "to <role>", o que as aplica por
-- omissão a TODAS as roles, incluindo "anon". Na maioria das tabelas isso
-- não abria nada (as condições dependem de auth.uid(), que é null sem
-- sessão → zero linhas), mas em "knowledge_base" a condição
-- "is_published = true or ..." não depende de identidade nenhuma: hoje,
-- QUALQUER pessoa com a anon key (pública, vai no browser) lê todos os
-- artigos publicados via /rest/v1/knowledge_base, sem sessão nenhuma —
-- contorna o login. Corrigido abaixo, e por consistência/defesa em
-- profundidade, aplicado "to authenticated" a todas as outras policies
-- também (evita que uma futura policy cometa o mesmo erro sem dar por
-- isso).

-- ── profiles ──────────────────────────────────────────────────────────
drop policy if exists "profiles: utilizador vê o próprio perfil" on public.profiles;
create policy "profiles: utilizador vê o próprio perfil"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "profiles: staff vê todos os perfis" on public.profiles;
create policy "profiles: staff vê todos os perfis"
  on public.profiles for select
  to authenticated
  using (public.current_role_is(array['admin', 'dev']));

drop policy if exists "profiles: utilizador atualiza o próprio perfil" on public.profiles;
create policy "profiles: utilizador atualiza o próprio perfil"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "profiles: admin gere perfis" on public.profiles;
create policy "profiles: admin gere perfis"
  on public.profiles for all
  to authenticated
  using (public.current_role_is(array['admin']))
  with check (public.current_role_is(array['admin']));

-- ── knowledge_base ── (a correção que importa de verdade) ──────────────
drop policy if exists "kb: qualquer autenticado lê conteúdo publicado" on public.knowledge_base;
create policy "kb: qualquer autenticado lê conteúdo publicado"
  on public.knowledge_base for select
  to authenticated
  using (is_published = true or public.current_role_is(array['admin', 'dev']));

drop policy if exists "kb: staff gere a base de conhecimento" on public.knowledge_base;
create policy "kb: staff gere a base de conhecimento"
  on public.knowledge_base for all
  to authenticated
  using (public.current_role_is(array['admin', 'dev']))
  with check (public.current_role_is(array['admin', 'dev']));

-- ── conversations ─────────────────────────────────────────────────────
drop policy if exists "conversations: cliente vê as próprias" on public.conversations;
create policy "conversations: cliente vê as próprias"
  on public.conversations for select
  to authenticated
  using (client_id = auth.uid());

drop policy if exists "conversations: cliente cria as próprias" on public.conversations;
create policy "conversations: cliente cria as próprias"
  on public.conversations for insert
  to authenticated
  with check (client_id = auth.uid());

drop policy if exists "conversations: staff vê todas" on public.conversations;
create policy "conversations: staff vê todas"
  on public.conversations for select
  to authenticated
  using (public.current_role_is(array['admin', 'dev']));

-- ── messages ──────────────────────────────────────────────────────────
drop policy if exists "messages: cliente vê mensagens das suas conversas" on public.messages;
create policy "messages: cliente vê mensagens das suas conversas"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.client_id = auth.uid()
    )
  );

drop policy if exists "messages: cliente insere nas suas conversas" on public.messages;
create policy "messages: cliente insere nas suas conversas"
  on public.messages for insert
  to authenticated
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.client_id = auth.uid()
    )
  );

drop policy if exists "messages: staff vê todas" on public.messages;
create policy "messages: staff vê todas"
  on public.messages for select
  to authenticated
  using (public.current_role_is(array['admin', 'dev']));

-- ── tickets ───────────────────────────────────────────────────────────
drop policy if exists "tickets: cliente vê os próprios" on public.tickets;
create policy "tickets: cliente vê os próprios"
  on public.tickets for select
  to authenticated
  using (client_id = auth.uid());

drop policy if exists "tickets: staff vê e gere todos" on public.tickets;
create policy "tickets: staff vê e gere todos"
  on public.tickets for all
  to authenticated
  using (public.current_role_is(array['admin', 'dev']))
  with check (public.current_role_is(array['admin', 'dev']));

-- ── ticket_updates ────────────────────────────────────────────────────
drop policy if exists "ticket_updates: cliente vê apenas notas visíveis dos seus tickets" on public.ticket_updates;
create policy "ticket_updates: cliente vê apenas notas visíveis dos seus tickets"
  on public.ticket_updates for select
  to authenticated
  using (
    visible_to_client = true
    and exists (
      select 1 from public.tickets t
      where t.id = ticket_id and t.client_id = auth.uid()
    )
  );

drop policy if exists "ticket_updates: staff vê e gere todas" on public.ticket_updates;
create policy "ticket_updates: staff vê e gere todas"
  on public.ticket_updates for all
  to authenticated
  using (public.current_role_is(array['admin', 'dev']))
  with check (public.current_role_is(array['admin', 'dev']));

-- ── ticket_attachments ────────────────────────────────────────────────
drop policy if exists "ticket_attachments: cliente vê anexos dos seus tickets" on public.ticket_attachments;
create policy "ticket_attachments: cliente vê anexos dos seus tickets"
  on public.ticket_attachments for select
  to authenticated
  using (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_id and t.client_id = auth.uid()
    )
  );

drop policy if exists "ticket_attachments: cliente anexa aos seus tickets" on public.ticket_attachments;
create policy "ticket_attachments: cliente anexa aos seus tickets"
  on public.ticket_attachments for insert
  to authenticated
  with check (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_id and t.client_id = auth.uid()
    )
  );

drop policy if exists "ticket_attachments: staff vê e gere todos" on public.ticket_attachments;
create policy "ticket_attachments: staff vê e gere todos"
  on public.ticket_attachments for all
  to authenticated
  using (public.current_role_is(array['admin', 'dev']))
  with check (public.current_role_is(array['admin', 'dev']));

-- ── notifications_log ─────────────────────────────────────────────────
drop policy if exists "notifications_log: staff vê tudo" on public.notifications_log;
create policy "notifications_log: staff vê tudo"
  on public.notifications_log for select
  to authenticated
  using (public.current_role_is(array['admin', 'dev']));

-- ── storage.objects (bucket "ticket-attachments") ───────────────────────
drop policy if exists "ticket-attachments: staff gere os ficheiros" on storage.objects;
create policy "ticket-attachments: staff gere os ficheiros"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'ticket-attachments' and public.current_role_is(array['admin', 'dev']))
  with check (bucket_id = 'ticket-attachments' and public.current_role_is(array['admin', 'dev']));


-- ══════════════════════════════════════════════════════════════════════
-- 4. PUBLIC BUCKET ALLOWS LISTING — bucket "logos"
-- ══════════════════════════════════════════════════════════════════════
-- O bucket "logos" é público (public = true) para servir logótipos por
-- URL direto — mas essa via de download público (/storage/v1/object/
-- public/logos/...) já funciona por causa da flag "public" do bucket, SEM
-- depender de nenhuma policy de storage.objects. A policy "logos: leitura
-- pública" só acrescentava a capacidade de LISTAR todos os ficheiros do
-- bucket (enumerar nomes de ficheiro de todos os clientes) — sem
-- benefício, só risco. Removida; a policy de staff (gestão) mantém-se.
drop policy if exists "logos: leitura pública" on storage.objects;

drop policy if exists "logos: staff gere os ficheiros" on storage.objects;
create policy "logos: staff gere os ficheiros"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'logos' and public.current_role_is(array['admin', 'dev']))
  with check (bucket_id = 'logos' and public.current_role_is(array['admin', 'dev']));


-- ══════════════════════════════════════════════════════════════════════
-- 5. LEAKED PASSWORD PROTECTION DISABLED — não é SQL
-- ══════════════════════════════════════════════════════════════════════
-- Isto não é uma tabela/função/policy — é uma definição do serviço de
-- Auth, ligada num toggle da dashboard, não corrível por SQL. Ativa em:
--   Supabase Studio → Authentication → Policies → Password Security
--   → "Leaked password protection" → On
-- (verifica a palavra-passe contra a base de dados HaveIBeenPwned no
-- momento do signup/alteração de password, sem enviar a password em
-- claro — só um hash truncado, k-anonymity).
