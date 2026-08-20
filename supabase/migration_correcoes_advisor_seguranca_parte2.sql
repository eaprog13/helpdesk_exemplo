-- ════════════════════════════════════════════════════════════════════════
-- Parte 2 — fecha os 7 avisos que sobraram depois de
-- migration_correcoes_advisor_seguranca.sql.
--
-- Porque sobraram: o "revoke execute ... from public" da parte 1 não
-- chegou. O Supabase concede EXECUTE a "anon" e "authenticated"
-- EXPLICITAMENTE por role quando a função é criada (via "alter default
-- privileges", configurado no provisionamento do projeto) — não é só
-- herança de PUBLIC. Revogar de PUBLIC não retira um grant que já foi
-- dado diretamente a "anon"/"authenticated". Aqui revogo dos três
-- explicitamente.
--
-- Idempotente — seguro correr mais do que uma vez. Não apaga dados.
-- ════════════════════════════════════════════════════════════════════════

-- current_role_is: continua a precisar de EXECUTE para "authenticated"
-- (é chamada dentro de várias policies RLS avaliadas para esse papel) —
-- só "anon" e o acesso via RPC direto é que fecham.
revoke execute on function public.current_role_is(roles text[]) from public, anon, authenticated;
grant execute on function public.current_role_is(roles text[]) to authenticated;

-- handle_new_user: só corre dentro do trigger "on_auth_user_created" —
-- nenhuma role precisa de o poder chamar diretamente.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- rls_auto_enable: mesma lógica (ver nota na parte 1 — função não
-- rastreada neste repositório, vale a pena confirmares o que faz).
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;


-- ══════════════════════════════════════════════════════════════════════
-- O que fica por resolver por SQL, e porquê
-- ══════════════════════════════════════════════════════════════════════
--
-- 1) function_search_path_mutable em "public.tsquery_or_agg"
--    É um AGREGADO (create aggregate), não uma função normal. O Postgres
--    não dá nenhuma forma de lhe fixar "search_path": "alter function"
--    recusa-se a atuar sobre um agregado (dá erro a dizer para usar
--    "alter aggregate"), e "alter aggregate" só suporta RENAME TO,
--    OWNER TO e SET SCHEMA — não existe "SET search_path" nem equivalente
--    para agregados em Postgres. Não há comando SQL que resolva isto.
--    Na prática o risco já está fechado: um agregado não executa SQL
--    próprio, só despacha para a "sfunc" (tsquery_or_sfunc), que já tem
--    search_path fixo desde a parte 1. Este aviso específico é um "falso
--    positivo" conhecido do linter para agregados — podes ignorá-lo com
--    segurança, ou registar como aceite/known-issue se o teu processo
--    exigir zero avisos.
--
-- 2) auth_leaked_password_protection
--    Não é SQL — é um toggle do serviço de Auth:
--      Supabase Studio → Authentication → Policies → Password Security
--      → "Leaked password protection" → On
