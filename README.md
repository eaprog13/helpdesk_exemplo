# Vértice · Centro de Apoio ao Cliente

Aplicação interna de apoio ao cliente da **Vértice**, desenvolvida para clientes com **sites institucionais** e **lojas online**.

> **Projeto de portefólio.** A "Vértice Digital", a equipa, os contactos e
> os clientes que aparecem nos dados de exemplo (`supabase/seed*.sql`) são
> fictícios.

O sistema disponibiliza uma experiência de suporte baseada em conversação, com histórico persistente e base de conhecimento interna. A **LLM** (fornecedor à escolha) nunca responde por conhecimento próprio — só embeleza texto já correto (histórico, KB, saudação, aviso de ticket). Quando uma questão não tem resposta no histórico nem na base de conhecimento, é criado sempre um ticket para a equipa de desenvolvimento, em vez de arriscar uma resposta inventada.

---

## Funcionalidades

* Autenticação de clientes através de credenciais criadas por um administrador.
* Chat de suporte com experiência semelhante ao ChatGPT.
* Histórico completo e persistente das conversas.
* Pesquisa automática no histórico do próprio cliente.
* Consulta da base de conhecimento interna.
* Integração com múltiplos fornecedores de LLM (só para embelezar texto — ver abaixo):

  * Gemini (Google AI Studio)
  * Anthropic Claude
  * OpenAI
  * GroqCloud
* Criação automática de tickets sempre que o histórico e a base de conhecimento não têm resposta.
* Gestão de clientes, developers e administradores.
* Notificações por email através do Resend.
* Notificações opcionais por WhatsApp através do Twilio.
* Controlo de acesso baseado em papéis:

  * `client`
  * `dev`
  * `admin`
* Protecções de segurança ao nível da aplicação e da base de dados.

O fluxo de resolução segue uma ordem definida, terminando assim que é encontrada uma resposta. A LLM nunca inventa factos específicos da Vértice (preços, prazos, procedimentos) fora do que está na base de conhecimento — nem por "embelezar" texto já correto, nem ao gerar uma resposta nova fundamentada nos excertos da KB:

```text
Mensagem do cliente
        │
        ▼
  É só conversa social? (saudação/agradecimento — regra fixa, sem LLM)
      /       \
    SIM       NÃO
    │          │
    ▼          ▼
Resposta    Histórico do cliente
simpática        │
fixa,       encontrou resposta confiante?
embelezada     /       \
             SIM       NÃO
             │          │
             ▼          ▼
          Resposta   Base de conhecimento tem 1 artigo confiante?
        (histórico,        /       \
         embelezada)     SIM       NÃO
                          │          │
                          ▼          ▼
                       Resposta   Já tentou 3x seguidas nesta conversa?
                      (KB, embe-      /       \
                       lezada)      NÃO       SIM
                                     │          │
                                     ▼          ▼
                        LLM tenta ajudar,   Mensagem fixa "encaminhado
                        fundamentada nos     para a equipa" (embelezada)
                        excertos da KB              │
                        (mesmo fracos) —             ▼
                        nunca inventa           Criar ticket
                        (conta como 1
                        tentativa)
```

Uma resposta confiante de histórico/KB (ou uma nova pergunta depois de uma dessas) reinicia a contagem de tentativas — só conta como "seguida" uma sequência de respostas da LLM sem nenhuma resposta confiante pelo meio.

---

## Stack

### Aplicação

* **Next.js 16**
* **React 18**
* **TypeScript**
* **Tailwind CSS**
* **App Router**

### Backend e dados

* **Supabase**
* **PostgreSQL**
* **Supabase Auth**
* **Row Level Security (RLS)**

### Inteligência Artificial

* **Gemini** (Google AI Studio) — fornecedor predefinido
* **Anthropic Claude**
* **OpenAI**
* **GroqCloud**

O fornecedor pode ser alterado através de uma variável de ambiente, sem necessidade de alterar a lógica de negócio. Em qualquer fornecedor, a LLM só é usada para **embelezar** texto já correto/aprovado (histórico, base de conhecimento, saudação, aviso de ticket) — nunca para responder por conhecimento próprio.

### Notificações

* **Resend** — email
* **Twilio** — WhatsApp

### Deploy

* **Vercel**

---

## Arquitectura

A aplicação segue uma arquitectura baseada em **Ports & Adapters**, mantendo a lógica de negócio independente da framework, da base de dados e dos fornecedores externos.

```text
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
    llm/                      Hoje: Gemini / Anthropic / OpenAI / GroqCloud.
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

- **Aberto** (`open`): criado pelo cliente (via chat → sem resposta no
  histórico nem na base de conhecimento, ou diretamente em "Abrir ticket")
  e atribuído ao departamento certo — ver
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
| Ninguém escolhe nem muda o próprio papel | `role` só vem de `app_metadata` (escrito pela service_role) e a chave pública não altera essa coluna | [supabase/schema.sql](supabase/schema.sql) (`handle_new_user`), [supabase/policies.sql](supabase/policies.sql) |
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

### Requisitos

* Node.js 20.9 ou superior (exigido pelo Next.js 16).
* Um projeto [Supabase](https://supabase.com) (o plano grátis chega).
* Uma chave de API do fornecedor de LLM escolhido (Gemini, Anthropic, OpenAI ou GroqCloud).
* Opcional: [Resend](https://resend.com) para enviar emails, [Twilio](https://www.twilio.com/whatsapp) para WhatsApp e [Upstash](https://upstash.com) para o rate limiting (recomendado em produção).

### 1. Supabase

1. Criar um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, correr por esta ordem:

   | # | Ficheiro | O que faz |
   |---|---|---|
   | 1 | `supabase/schema.sql` | Tabelas, índices, funções de pesquisa, buckets de Storage (`logos`, `ticket-attachments`) e o trigger que cria o perfil ao criar um utilizador |
   | 2 | `supabase/policies.sql` | Row Level Security |
   | 3 | `supabase/migration_correcoes_advisor_seguranca.sql` | Endurecimento pedido pelo Security Advisor do Supabase (`search_path` fixo, permissões das funções) |
   | 4 | `supabase/migration_correcoes_advisor_seguranca_parte2.sql` | Idem, segunda parte |
   | 5 | `supabase/seed.sql` | *(opcional)* Artigos de exemplo da Base de Conhecimento |
   | 6 | `supabase/seed_knowledge_base_institucional.sql` | *(opcional)* Factos da empresa (serviços, preços, contactos) |
   | 7 | `supabase/seed_knowledge_base_paginas_internas.sql` | *(opcional)* Complementa o anterior — correr depois dele |
   | 8 | `supabase/seed_knowledge_base_operacional.sql` | *(opcional)* Dia a dia do cliente (pagamentos, acessos, site em baixo…) |

   Todos são idempotentes — podem voltar a correr-se sem duplicar nada.
3. Em **Authentication → Sign In / Providers**, desligar **"Allow new users
   to sign up"**: as contas são criadas só pelos admins (pela app ou pelo
   painel).
4. Em **Authentication → URL Configuration**, definir o **Site URL** (ex.:
   `http://localhost:3000`) e acrescentar `<endereço da app>/api/auth/callback`
   aos **Redirect URLs** — é para onde volta o link de "recuperar password".
5. Em **Project Settings → API**, copiar `URL`, `anon public key` e
   `service_role key` para o `.env.local` (ver secção seguinte).
6. Criar o primeiro **admin**: em **Authentication → Users → Add user**,
   criar a conta (com **"Auto Confirm User"** marcado) e depois, no SQL
   Editor:
   ```sql
   update public.profiles set role = 'admin', full_name = 'O seu nome'
   where id = '<uuid do utilizador criado>';
   ```
   A partir daqui tudo se faz pela interface: clientes em `/admin/clients`
   e equipa (devs/admins, com departamento) em `/admin/team`. Cada conta
   nova recebe por email uma password temporária, que tem de ser mudada no
   primeiro acesso. Um dev sem departamento nunca é candidato à atribuição
   automática de tickets.

> **Base de dados criada com uma versão anterior?** Os ficheiros
> `supabase/migration_*.sql` atualizam-na sem perder dados (cada um explica
> no topo o que muda). Uma instalação nova a partir de `schema.sql` não
> precisa de nenhum deles, além dos dois do Security Advisor (passos 3 e 4).
>
> | Migração | Quando correr |
> |---|---|
> | `migration_proteger_role.sql` | **Sempre**, em qualquer base de dados criada antes desta correção: impede que um utilizador escolha ou mude o próprio papel |
> | `migration_flexibilidade_pesquisa.sql` e depois `migration_corrigir_double_stemming.sql` | Pesquisa (histórico e KB) tolerante a perguntas longas |
> | `migration_adicionar_departamentos.sql` | Departamentos, prioridade e atribuição automática de tickets |
> | `migration_tipos_site_multiplos.sql` | `site_type` passa de valor único a lista |
> | `migration_anexos_ticket.sql` | Anexos nos tickets |
> | `migration_contador_reaberturas.sql` | Contador de reaberturas (dashboard) |
> | `migration_historico_ignorar_ticket_ack.sql` | A pesquisa no histórico ignora os avisos de "ticket aberto" |
> | `migration_ativar_rls.sql` | Garante RLS ligado em todas as tabelas |
> | `migration_atualizar_kb_institucional.sql`, `migration_kb_titulos_operacionais.sql` | Atualizam artigos de seeds corridos antes destas versões |
>
> `supabase/provisionar_equipa.sql` é o antigo processo manual de criar a
> equipa por SQL — hoje faz-se em `/admin/team`.

### 2. Variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencher as variáveis com as credenciais reais. Cada uma está explicada no
`.env.example`; as obrigatórias são as do Supabase, `LLM_PROVIDER` e a chave
desse fornecedor. O fornecedor de LLM é definido através de:

```env
LLM_PROVIDER=gemini   # gemini | anthropic | openai | groq
```

Sem `RESEND_API_KEY` as contas criam-se na mesma e, em desenvolvimento, a
password temporária aparece no terminal onde corre o `npm run dev` (para se
poder testar o login de um cliente). Em produção não é impressa em lado
nenhum — configurar o Resend antes de criar clientes.

> **Importante:** nunca adicionar `.env.local` ao repositório Git.

### 3. Execução local

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) e entrar com o admin
criado no passo 6. Outros comandos:

```bash
npm run lint        # ESLint
npm run typecheck   # verificação de tipos (tsc)
npm run build       # build de produção
```

### 4. Deploy na Vercel

1. Importar o repositório em [vercel.com/new](https://vercel.com/new).
2. Configurar as mesmas variáveis de ambiente do `.env.local` em
   **Project Settings → Environment Variables**.
3. Atualizar `ALLOWED_ORIGINS` e `NEXT_PUBLIC_APP_URL` para o domínio real
   de produção, e o **Site URL** / **Redirect URLs** do Supabase também.
4. Deploy. As funções correm em Frankfurt (`fra1`, ver `vercel.json`),
   perto da base de dados do Supabase na UE.

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
  de tickets abertos para os devs. Seeds prontos a correr no SQL
  Editor (ver "Configuração"): [`supabase/seed_knowledge_base_institucional.sql`](supabase/seed_knowledge_base_institucional.sql)
  e [`supabase/seed_knowledge_base_paginas_internas.sql`](supabase/seed_knowledge_base_paginas_internas.sql)
  (factos do site institucional — serviços, preços de referência,
  processo, equipa, portefólio, contactos)
  e [`supabase/seed_knowledge_base_operacional.sql`](supabase/seed_knowledge_base_operacional.sql)
  (dia a dia do cliente já em produção: pagamentos, acessos, site em
  baixo, alterações, funcionalidades novas, atualizações, e como usar o
  próprio centro de apoio — recuperar password, acompanhar o estado de um
  ticket). Este segundo inclui algumas entradas `[REVER]` por publicar —
  rever e confirmar em `/admin/knowledge-base` antes de as ativar.
