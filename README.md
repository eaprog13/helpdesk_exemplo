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
| Rate limiting | `/api/chat`, criação de clientes | [src/lib/security/rateLimit.ts](src/lib/security/rateLimit.ts) (Upstash, opcional) |
| Validação de input | Todas as rotas de API | `zod` |
| Segredos nunca expostos ao browser | Chaves de BD/LLM/Resend/Twilio | `import "server-only"` em todos os adaptadores e serviços do servidor |
| Password forte obrigatória no 1º acesso | Fluxo de credenciais temporárias | [src/app/change-password/page.tsx](src/app/change-password/page.tsx) |

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
   A partir daqui, esse admin já pode criar os restantes clientes/devs pela
   interface em `/admin/clients` (para devs, criar o utilizador da mesma
   forma e definir `role = 'dev'`).

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
  (factos do site/marketing) e
  [`supabase/seed_knowledge_base_operacional.sql`](supabase/seed_knowledge_base_operacional.sql)
  (dia a dia do cliente já em produção: pagamentos, acessos, site em
  baixo, alterações, funcionalidades novas, atualizações). Este segundo
  inclui algumas entradas `[REVER]` por publicar — rever e confirmar em
  `/admin/knowledge-base` antes de as ativar.
