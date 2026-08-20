# Vértice · Centro de Apoio ao Cliente

Aplicação interna de apoio ao cliente para a Vértice, destinada a clientes com
**sites institucionais** e **lojas online**. Fluxo:

1. O cliente recebe as credenciais de acesso por email (criadas por um admin).
2. A primeira página é só um logótipo e uma caixa de login. Só depois de
   autenticar é que a caixa de pergunta abre — estilo ChatGPT: o cliente
   escreve a pergunta e a resposta aparece numa caixa de texto por baixo.
   Não há mais nenhuma ação exigida ao cliente. Ao abrir o chat, vê sempre
   o histórico completo das suas perguntas anteriores (a conversa persiste
   entre sessões — não há "novo chat", é uma única conversa contínua).
3. Cada pergunta nova é resolvida por esta ordem, parando na primeira que
   der resposta:
   1. **Histórico do próprio cliente** — já perguntou algo parecido antes?
      Reutiliza essa resposta em vez de repetir todo o processo.
   2. **Contexto do site da Vértice** — a base de conhecimento interna tem
      resposta?
   3. **LLM** — Gemini, Anthropic Claude ou OpenAI, à escolha, trocável por
      variável de ambiente sem alterar código.
4. Sempre que é necessário recorrer à LLM (ou seja, nem o histórico nem a
   base de conhecimento tinham resposta), é aberto automaticamente um
   **ticket para os devs**.
5. O cliente é acompanhado por **email** (Resend) e, opcionalmente,
   **WhatsApp** (Twilio) sempre que o ticket é criado ou resolvido.

## Stack (hoje) — e por que não fica presa a ela

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- **Supabase** (Postgres + Auth) — Vercel para deploy
- LLM: **Gemini** por omissão, com **Anthropic Claude** e **OpenAI** disponíveis
- Email: **Resend** · WhatsApp: **Twilio**

Esta é a stack escolhida *hoje*, mas o código está organizado para que
**nenhuma destas escolhas fique espalhada pela aplicação**. Ver secção
"Arquitetura" abaixo — é o que torna trivial, no futuro, trocar de
framework, de base de dados ou de fornecedor de LLM/notificações.

## Arquitetura: núcleo isolado de frameworks (ports & adapters)

```
src/
  core/                    ← lógica de negócio PURA. Zero imports de Next.js,
    types.ts                 Supabase, ou qualquer SDK. Só TypeScript simples.
    deps.ts                  Isto é o que garante a independência de framework/BD.
    ports/                 ← contratos (interfaces): o que o negócio PRECISA,
      repositories.ts        não COMO é implementado.
      identity.ts
      llm.ts
      notifications.ts
    services/               ← casos de uso (regras de negócio): perguntar,
      chatService.ts          criar/atualizar ticket, criar cliente, gerir KB.
      ticketService.ts        Só recebem `deps` (as implementações dos ports).
      clientService.ts        Testáveis sem Next.js, sem Supabase, sem rede.
      knowledgeBaseService.ts
      authService.ts

  adapters/                ← implementações concretas dos ports de cima.
    supabase/                 Hoje: Supabase (Postgres + Auth).
    llm/                      Hoje: Gemini / Anthropic / OpenAI.
    notifications/            Hoje: Resend (email) / Twilio (WhatsApp).

  composition/
    container.ts            ← ÚNICO ficheiro que decide "qual implementação
                               usar". Para trocar de BD ou de fornecedor,
                               é aqui (e só aqui) que se troca a instância.

  app/                      ← Next.js: rotas/páginas — camada fina. As rotas
                               de API só validam o pedido HTTP e chamam
                               core/services; não têm lógica de negócio.
  lib/                      ← infraestrutura específica do Next.js: sessão
                               (cookies), cabeçalhos de segurança, CORS,
                               rate limit. É o que muda se trocar de framework.
  components/               ← UI (React/Tailwind).
```

**O que isto significa na prática:**

- **Trocar de LLM** (ex.: Gemini → outro): mudar `LLM_PROVIDER` no
  `.env` — zero alterações de código. Para adicionar um fornecedor novo que
  ainda não exista, escrever uma classe em `src/adapters/llm/` que
  implemente `LlmProvider` (ver `src/core/ports/llm.ts`) e adicioná-la ao
  `switch` em `src/composition/container.ts`.
- **Trocar de base de dados** (Supabase → Postgres direto, PlanetScale,
  Firebase, etc.): escrever novas classes em `src/adapters/<novo-bd>/` que
  implementem as interfaces de `src/core/ports/repositories.ts`, e trocar
  as instâncias em `src/composition/container.ts`. **Nada em `core/` ou nas
  rotas muda.**
- **Trocar de framework web** (Next.js → Express, Fastify, Remix, etc.): só
  se reescreve a camada fina em `src/app/api/*` (que hoje só faz
  `parse → chamar core/services → formatar resposta`) e `src/lib/auth/session.ts`
  (a única peça que obrigatoriamente conhece "cookies/pedido HTTP" — isto é
  inevitável em qualquer framework, mas fica isolado a um único ficheiro).
  Toda a lógica de negócio em `core/` seria reaproveitada sem alterações.
  (A interface React/Tailwind em si é sempre específica da tecnologia de UI
  escolhida — isso não é algo que se consiga tornar "framework-agnóstico"
  em nenhuma stack, é inerente a ter uma UI.)

## Fluxo de um ticket

```
aberto ──(dev assume)──▶ em resolução ──(dev entrega resposta)──▶ resolvido
                              ▲                                       │
                              └────────(cliente: "falta isto")────────┤
                                                                       │
                                                          (cliente: "resolvido") 
                                                                       ▼
                                                                    fechado
```

- **Aberto** (`open`): criado pelo cliente (via chat → LLM sem resposta, ou
  diretamente em "Abrir ticket") e atribuído ao departamento certo — ver
  `escolherDevPorMenorCarga` em [ticketService.ts](src/core/services/ticketService.ts).
  Sem devs validados nesse departamento, fica sem dev até um admin atribuir
  à mão.
- **Em resolução** (`in_progress`): o dev "assume" o ticket (auto-atribui-se
  se ainda estava sem dev) — botão "Assumir ticket" em `/admin/tickets/:id`.
- **Resolvido** (`resolved`): o dev entrega a resposta — a nota é sempre
  entregue ao cliente (por email/WhatsApp) e passa a ser obrigatória para
  fazer esta transição.
- **Fechado** (`closed`) ou de volta a **Em resolução**: só o cliente
  decide, no ecrã do seu pedido — "Confirmar resolução" fecha; "Preciso de
  mais alguma coisa" devolve ao mesmo dev com uma nota do que falta, e o
  ciclo repete-se até fechar.

Um `dev` só pode seguir este fluxo passo a passo, e só em tickets seus (ou
por assumir, do seu departamento) — ver `validarTransicaoDev` em
[ticketService.ts](src/core/services/ticketService.ts). Um `admin` pode
saltar diretamente para qualquer estado (para corrigir enganos), incluindo
fechar/reabrir em nome do cliente. A API do cliente
(`POST /api/tickets/:id/resposta-cliente`) só aceita as duas transições que
são dele: `resolved → closed` e `resolved → in_progress`.

A sidebar de um `dev` (`/admin`, layout partilhado com `admin`) reflete este
fluxo: **Os meus tickets** (atribuídos a mim, qualquer estado), **Fila do
departamento** (abertos, sem dev, do meu departamento — por agarrar) e
**Todos os tickets**; a gestão de clientes fica fora da sidebar do dev
(criar clientes é só de admin — ver `POST /api/admin/clients`).

## Cores da marca

- Texto/marca: `#09182A`
- Fundo: neutro claro e profissional (`#F4F6F8`)
- Acento (CTAs/links): `#0F6E8C`, derivado da cor de marca

Definidas em [tailwind.config.ts](tailwind.config.ts) como `ink`, `surface` e `accent`.

## Segurança implementada

Como a aplicação corre em ambiente serverless (Vercel), não se usa
literalmente o middleware "helmet" do Express — o equivalente nativo do
Next.js é usado nos mesmos pontos:

| Proteção | Onde | Ficheiro |
|---|---|---|
| Cabeçalhos tipo *helmet* (CSP, HSTS, X-Frame-Options, etc.) | Middleware, em todas as respostas | [middleware.ts](middleware.ts), [src/lib/security/headers.ts](src/lib/security/headers.ts) |
| CORS explícito por origem | Rotas de API | [src/lib/security/cors.ts](src/lib/security/cors.ts) |
| Autenticação por JWT | Sessão Supabase Auth, verificada no servidor a cada pedido | [src/lib/auth/session.ts](src/lib/auth/session.ts) |
| Autorização por papel (client/dev/admin) | `requireRole()` nas rotas sensíveis + regras em `core/services` | [src/lib/auth/session.ts](src/lib/auth/session.ts), [src/core/services/ticketService.ts](src/core/services/ticketService.ts) |
| Row Level Security (defesa em profundidade a nível da BD) | Todas as tabelas | [supabase/policies.sql](supabase/policies.sql) |
| Rate limiting | `/api/chat`, `/api/tickets`, criação de clientes | [src/lib/security/rateLimit.ts](src/lib/security/rateLimit.ts) (Upstash, opcional) |
| Validação de input | Todas as rotas de API | `zod` |
| Segredos nunca expostos ao browser | Chaves de BD/LLM/Resend/Twilio | `import "server-only"` em todos os adaptadores e serviços do servidor |
| Password forte obrigatória no 1º acesso | Fluxo de credenciais temporárias | [src/app/change-password/page.tsx](src/app/change-password/page.tsx) |
| Recuperação de password sem revelar se o email existe | Mesma mensagem de sucesso independentemente do resultado | [src/components/auth/ForgotPasswordForm.tsx](src/components/auth/ForgotPasswordForm.tsx) |

### Recuperar password

O cliente pede um link em `/forgot-password` (Supabase Auth envia o email
via as suas próprias definições de SMTP/template — configurar em
**Authentication → Email Templates** no painel Supabase). O link volta à
app em `/api/auth/callback`, que troca o código por uma sessão e reencaminha
para `/change-password` (o mesmo ecrã já usado no 1º acesso). Para o link
funcionar, `NEXT_PUBLIC_APP_URL` (ou o domínio real, em produção) tem de
estar na lista **Authentication → URL Configuration → Redirect URLs** do
projeto Supabase.

## Configuração

### 1. Supabase

1. Criar um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, correr por ordem: `supabase/schema.sql`,
   `supabase/policies.sql` e, opcionalmente, `supabase/seed.sql`.
3. Em **Project Settings → API**, copiar `URL`, `anon public key` e
   `service_role key` para o `.env.local` (ver secção seguinte).
4. Criar o primeiro utilizador **admin** manualmente: em
   **Authentication → Users → Add user**, criar a conta e depois, no SQL
   Editor, correr:
   ```sql
   update public.profiles set role = 'admin', full_name = 'O seu nome'
   where id = '<uuid do utilizador criado>';
   ```
   A partir daqui, esse admin já pode criar os restantes clientes pela
   interface em `/admin/clients`; para devs, criar o utilizador da mesma
   forma manual e definir `role = 'dev'` **e** `department` (`'desenvolvimento'`,
   `'marketing'`, `'design'` ou `'geral'` — sem departamento, esse dev nunca
   é candidato à atribuição automática de tickets, ver
   [supabase/migration_adicionar_departamentos.sql](supabase/migration_adicionar_departamentos.sql)):
   ```sql
   update public.profiles set role = 'dev', department = 'desenvolvimento', full_name = 'Nome do dev'
   where id = '<uuid do utilizador criado>';
   ```

> **Se já tinha corrido `schema.sql` antes** desta versão (que acrescentou a
> pesquisa no histórico do cliente), o `create table if not exists` não
> atualiza tabelas já existentes — correr também isto uma vez no SQL Editor:
> ```sql
> alter table public.messages drop constraint if exists messages_source_check;
> alter table public.messages
>   add constraint messages_source_check check (source in ('history', 'knowledge_base', 'llm', 'ticket_ack'));
> ```
> (`schema.sql` continua seguro de correr do zero num projeto novo.)

> **Se já tinha corrido `schema.sql`/o seed antes de 2026-08-19**, correr
> também [`supabase/migration_flexibilidade_pesquisa.sql`](supabase/migration_flexibilidade_pesquisa.sql)
> uma vez no SQL Editor: torna a pesquisa (histórico e base de conhecimento)
> tolerante a perguntas com mais palavras — antes, `plainto_tsquery` exigia
> que TODAS as palavras da pergunta aparecessem no documento, pelo que
> perguntas mais longas/naturais (ex.: "prazo de entrega de projeto")
> podiam falhar onde a versão curta ("projeto entrega") resultava — e
> remove 11 entradas duplicadas da Base de Conhecimento deixadas por um
> seed corrido duas vezes. (`schema.sql`/`seed_knowledge_base_institucional.sql`
> já incluem a correção para instalações novas.)

> **Se já tinha corrido `migration_flexibilidade_pesquisa.sql`**, correr
> também [`supabase/migration_corrigir_double_stemming.sql`](supabase/migration_corrigir_double_stemming.sql):
> aquela migração convertia o AND de `plainto_tsquery` em OR manipulando o
> *texto* do tsquery já processado — mas `to_tsquery` volta a aplicar o
> dicionário 'portuguese' a esse texto, o que "re-stemma" lexemas já
> stemmed (ex.: "problema" → `problem` → `probl` na 2ª passagem), fazendo
> certas palavras (comprovado: "problema") não devolverem nenhum resultado
> mesmo estando literalmente no título de vários artigos. A correção
> stemma cada palavra uma única vez e combina os resultados como valores
> `tsquery`, nunca como texto. (`schema.sql` já inclui a correção.)

> **Se já tinha corrido `schema.sql` antes de 2026-08-20**, correr também
> [`supabase/migration_adicionar_departamentos.sql`](supabase/migration_adicionar_departamentos.sql):
> acrescenta a coluna `department` a `profiles`/`knowledge_base`/`tickets`
> (base da prioridade Crítica/Alta/Média/Baixa e da atribuição automática
> de tickets por departamento + carga de trabalho) e classifica os
> artigos da KB que já existirem. Sem isto, todos os devs/artigos/tickets
> ficam sem
> departamento e nenhum ticket é atribuído automaticamente — cai sempre
> em "Por atribuir". (`schema.sql` e os dois `seed_knowledge_base_*.sql` já
> incluem isto para instalações novas.)

> **Se já tinha corrido `schema.sql` antes de 2026-08-20**, correr também
> [`supabase/migration_tipos_site_multiplos.sql`](supabase/migration_tipos_site_multiplos.sql):
> `site_type` (em `profiles` e `knowledge_base`) passa de valor único
> (`institutional`/`ecommerce`/`both`) para array de valores
> (`institutional`/`ecommerce`/`web_app`/`mobile_app`/`other`) — um cliente
> pode ter mais do que um tipo de produto (ex.: site institucional E loja
> online), mostrados lado a lado em `/admin/clients` em vez de um valor
> genérico "Ambos". A migração converte os dados existentes automaticamente
> (`both` → `{institutional, ecommerce}` num cliente, `{}` — "genérico,
> aplica-se a todos" — num artigo da KB), mas vale a pena rever os clientes
> convertidos na tabela que a própria migração devolve no fim. (`schema.sql`
> e os `seed_knowledge_base_*.sql`/`seed.sql` já incluem isto para
> instalações novas.)

### 2. Variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencher `.env.local` com as chaves reais. Para a LLM, só é preciso
preencher a chave do fornecedor escolhido em `LLM_PROVIDER` (por omissão
`gemini`) — ver comentários em [.env.example](.env.example) para onde obter
cada chave (Supabase, Gemini/Anthropic/OpenAI, Resend, Twilio, Upstash
opcional).

### 3. Instalar e correr localmente

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

### 4. Deploy na Vercel

1. Importar o repositório em [vercel.com/new](https://vercel.com/new).
2. Configurar as mesmas variáveis de ambiente do `.env.local` em
   **Project Settings → Environment Variables**.
3. Atualizar `ALLOWED_ORIGINS` e `NEXT_PUBLIC_APP_URL` para o domínio real
   de produção.
4. Deploy.

## Notas e próximos passos sugeridos

- **WhatsApp**: por defeito `WHATSAPP_NOTIFICATIONS_ENABLED=false`. O
  sandbox Twilio serve para testes; em produção é necessário um número
  aprovado e templates de mensagem aprovados pela Meta para contactar
  clientes fora da janela de 24h.
- **Rate limiting**: sem `UPSTASH_REDIS_REST_URL`/`TOKEN`, fica inativo
  (não bloqueia nada). Recomendado configurar em produção.
- **Base de conhecimento**: usa pesquisa full-text nativa do Postgres
  (`tsvector`, dicionário `portuguese`). Para respostas semânticas mais
  refinadas (parafraseando a pergunta), pode evoluir-se para `pgvector` com
  embeddings — como o acesso a dados está todo atrás de
  `KnowledgeBaseRepository` (ver "Arquitetura" acima), essa troca fica
  contida no adaptador Supabase, sem tocar no resto da aplicação.
- **Streaming da LLM**: atualmente a resposta é devolvida de uma vez. Pode
  evoluir-se `/api/chat` e `LlmProvider.generateAnswer` para *streaming*
  para uma experiência mais próxima do ChatGPT token-a-token.
- Popular `knowledge_base` com o conteúdo real dos procedimentos da Vértice
  é o que determina a qualidade das respostas automáticas e reduz o volume
  de tickets abertos para os devs. Dois seeds prontos a correr no SQL
  Editor: [`supabase/seed_knowledge_base_institucional.sql`](supabase/seed_knowledge_base_institucional.sql)
  (factos do site institucional — serviços, preços de referência,
  processo, equipa, portefólio, contactos, lido diretamente de
  [vertice-digital.example](https://vertice-digital.example/))
  e [`supabase/seed_knowledge_base_operacional.sql`](supabase/seed_knowledge_base_operacional.sql)
  (dia a dia do cliente já em produção: pagamentos, acessos, site em
  baixo, alterações, funcionalidades novas, atualizações, e como usar o
  próprio centro de apoio — recuperar password, acompanhar o estado de um
  ticket). Este segundo inclui algumas entradas `[REVER]` por publicar —
  rever e confirmar em `/admin/knowledge-base` antes de as ativar.

> **Se já tinha corrido `seed_knowledge_base_institucional.sql` antes de
> 2026-08-20**, correr também
> [`supabase/migration_atualizar_kb_institucional.sql`](supabase/migration_atualizar_kb_institucional.sql)
> uma vez no SQL Editor: o site institucional da Vértice Digital mudou
> (email, telefone, morada, equipa, portefólio, preços agora públicos, e o
> serviço de "Automação e IA" deixou de existir como página própria) e,
> como o seed usa `on conflict (title) do nothing`, voltar a correr o
> ficheiro sozinho não atualiza as linhas já inseridas com os factos
> antigos — só esta migração o faz. (`seed_knowledge_base_institucional.sql`
> já inclui os factos corrigidos para instalações novas.)
>
> O código postal (1000-100) foi confirmado a partir do rodapé do site
> (repetido de forma consistente em home/sobre/contactos) — a página de
> Contactos, isolada, mostra 1000-130; se algum dia corrigirem essa
> inconsistência no site, atualizar aqui também.
