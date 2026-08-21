-- Migração: garantir Row Level Security ligado em todas as tabelas
-- públicas. Gerado a 2026-08-20, na sequência de uma auditoria de
-- segurança — ver a nota em schema.sql, secção "Row Level Security".
--
-- No projeto Supabase real já estava ligado (confirmado ao vivo: a chave
-- anon, sem sessão, já não conseguia ler nem escrever nada — 42501/vazio)
-- — esta migração é sobretudo para o schema.sql (a fonte de instalação
-- de raiz) deixar de ficar dessincronizado do que já está em produção:
-- sem isto, uma instalação nova a partir de schema.sql nasceria SEM esta
-- proteção. "alter table ... enable row level security" é idempotente —
-- seguro correr outra vez mesmo já estando ligado.
--
-- Sem "create policy" nenhuma, de propósito: este projeto só acede a
-- estas tabelas com a chave service_role (ver src/lib/supabase/admin.ts),
-- que ignora sempre RLS — toda a autorização é decidida em código, em
-- core/services/*.ts. RLS ligado + zero policies = negar tudo por
-- omissão a qualquer pedido feito com a chave anon (a única que fica
-- exposta ao browser).
--
-- Como aplicar: colar no SQL Editor do Supabase e correr. Idempotente.

alter table public.profiles enable row level security;
alter table public.knowledge_base enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_updates enable row level security;
alter table public.ticket_attachments enable row level security;
alter table public.notifications_log enable row level security;
