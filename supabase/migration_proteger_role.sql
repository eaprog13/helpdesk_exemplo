-- ════════════════════════════════════════════════════════════════════════
-- Migração: impedir que um utilizador escolha ou mude o próprio role.
--
-- Duas falhas fechadas aqui (schema.sql/policies.sql já incluem as duas
-- correções para instalações novas):
--
-- 1) handle_new_user lia o role de raw_user_meta_data. Esse campo é escrito
--    por quem se regista (signUp com a chave anon, que é pública): com o
--    registo público ligado no Supabase, qualquer pessoa podia criar uma
--    conta já como 'admin'. Passa a ler de raw_app_meta_data, que só a
--    chave service_role consegue escrever (a app já envia o role aí — ver
--    src/adapters/supabase/identityAdminProvider.ts).
--
-- 2) A policy "profiles: utilizador atualiza o próprio perfil" limita a
--    linha, não as colunas: um cliente autenticado podia fazer
--    PATCH /rest/v1/profiles?id=eq.<o seu id> com {"role": "admin"}.
--    Pela chave anon/authenticated passa a só se poder alterar o nome e o
--    telefone; o resto só pela service_role (o que a app usa no servidor).
--
-- Idempotente — seguro correr mais do que uma vez. Não apaga dados nem
-- muda o role de ninguém (os perfis já existentes ficam como estão).
-- Correr no SQL Editor do Supabase.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, company_name, phone)
  values (
    new.id,
    coalesce(new.raw_app_meta_data ->> 'role', 'client'),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.raw_user_meta_data ->> 'company_name',
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

revoke update on public.profiles from anon, authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

-- Verificação: deve devolver só full_name e phone.
select column_name
from information_schema.column_privileges
where table_schema = 'public' and table_name = 'profiles'
  and grantee = 'authenticated' and privilege_type = 'UPDATE'
order by column_name;
