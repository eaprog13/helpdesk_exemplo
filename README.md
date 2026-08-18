# Vértice · Centro de Apoio ao Cliente

Aplicação interna de apoio ao cliente da **Vértice**, desenvolvida para clientes com **sites institucionais** e **lojas online**.

O sistema disponibiliza uma experiência de suporte baseada em conversação, com histórico persistente, base de conhecimento interna e integração com diferentes fornecedores de **LLM**. Quando uma questão não pode ser resolvida automaticamente, é criado um ticket para a equipa de desenvolvimento.

---

## Funcionalidades

* Autenticação de clientes através de credenciais criadas por um administrador.
* Chat de suporte com experiência semelhante ao ChatGPT.
* Histórico completo e persistente das conversas.
* Pesquisa automática no histórico do próprio cliente.
* Consulta da base de conhecimento interna.
* Integração com múltiplos fornecedores de LLM:

  * Gemini
  * Anthropic Claude
  * OpenAI
* Criação automática de tickets quando é necessária intervenção dos developers.
* Gestão de clientes, developers e administradores.
* Notificações por email através do Resend.
* Notificações opcionais por WhatsApp através do Twilio.
* Controlo de acesso baseado em papéis:

  * `client`
  * `dev`
  * `admin`
* Protecções de segurança ao nível da aplicação e da base de dados.

O fluxo de resolução segue uma ordem definida, terminando assim que é encontrada uma resposta:

```text
Pergunta do cliente
        │
        ▼
Histórico do cliente
        │
   encontrou resposta?
      /       \
    SIM       NÃO
    │          │
    ▼          ▼
 Resposta   Base de conhecimento
                │
           encontrou resposta?
              /       \
            SIM       NÃO
            │          │
            ▼          ▼
         Resposta      LLM
                         │
                         ▼
                    Criar ticket
```

---

## Stack

### Aplicação

* **Next.js 14**
* **React**
* **TypeScript**
* **Tailwind CSS**
* **App Router**

### Backend e dados

* **Supabase**
* **PostgreSQL**
* **Supabase Auth**
* **Row Level Security (RLS)**

### Inteligência Artificial

* **Gemini** — fornecedor predefinido
* **Anthropic Claude**
* **OpenAI**

O fornecedor pode ser alterado através de uma variável de ambiente, sem necessidade de alterar a lógica de negócio.

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
├── core/
│   ├── types.ts
│   ├── deps.ts
│   ├── ports/
│   │   ├── repositories.ts
│   │   ├── identity.ts
│   │   ├── llm.ts
│   │   └── notifications.ts
│   └── services/
│       ├── chatService.ts
│       ├── ticketService.ts
│       ├── clientService.ts
│       ├── knowledgeBaseService.ts
│       └── authService.ts
│
├── adapters/
│   ├── supabase/
│   ├── llm/
│   └── notifications/
│
├── composition/
│   └── container.ts
│
├── app/
│   └── api/
│
├── lib/
│   ├── auth/
│   └── security/
│
└── components/
```

### Core

A pasta `core/` contém a lógica de negócio da aplicação.

Não depende directamente de:

* Next.js
* Supabase
* SDKs externos
* HTTP
* Cookies
* Infraestrutura específica

Os contratos necessários são definidos através de interfaces nos `ports`.

Isto permite testar os casos de uso sem depender de rede, base de dados ou framework web.

### Adapters

Os `adapters/` implementam concretamente os contratos definidos pelo `core`.

Exemplos:

```text
Supabase
Gemini
Anthropic
OpenAI
Resend
Twilio
```

### Composition

`src/composition/container.ts` é o ponto central onde são escolhidas as implementações concretas.

É, por exemplo, aqui que a aplicação decide qual fornecedor de LLM utilizar.

### App

A camada `app/` contém a integração com o Next.js.

As rotas API devem permanecer finas:

```text
Pedido HTTP
    ↓
Validar input
    ↓
Chamar serviço
    ↓
Formatar resposta
```

A lógica de negócio permanece no `core/`.

---

## Independência tecnológica

A arquitectura permite substituir componentes sem reescrever a lógica de negócio.

### Trocar o fornecedor de LLM

Para alterar o fornecedor actualmente configurado, basta alterar:

```env
LLM_PROVIDER=gemini
```

Para adicionar um novo fornecedor, é criada uma implementação de `LlmProvider` em:

```text
src/adapters/llm/
```

e adicionada ao `container.ts`.

### Trocar a base de dados

A implementação actual utiliza Supabase/PostgreSQL.

Uma futura implementação poderia utilizar outro sistema de persistência através de novos adapters que implementem os contratos existentes em:

```text
src/core/ports/repositories.ts
```

O `core/` permanece inalterado.

### Trocar a framework web

A lógica de negócio pode ser reutilizada noutra framework web.

A camada específica de Next.js é mantida isolada, principalmente em:

```text
src/app/
src/lib/
```

A interface React/Tailwind permanece naturalmente dependente das tecnologias utilizadas na camada de apresentação.

---

## Segurança

A aplicação implementa várias camadas de protecção.

| Protecção          | Implementação                            |
| ------------------ | ---------------------------------------- |
| Security headers   | CSP, HSTS, X-Frame-Options, entre outros |
| CORS               | Origens explicitamente autorizadas       |
| Autenticação       | Supabase Auth / JWT                      |
| Autorização        | Roles `client`, `dev` e `admin`          |
| Row Level Security | Políticas aplicadas na base de dados     |
| Rate limiting      | Upstash, opcional                        |
| Validação          | `zod`                                    |
| Segredos           | Mantidos exclusivamente no servidor      |
| Password inicial   | Alteração obrigatória no primeiro acesso |

Os principais pontos de segurança encontram-se em:

```text
middleware.ts
src/lib/security/
src/lib/auth/
supabase/policies.sql
```

As chaves privadas e credenciais de serviços externos não são expostas ao browser.

---

## Base de conhecimento

A base de conhecimento utiliza pesquisa **full-text** nativa do PostgreSQL através de `tsvector`, com dicionário de pesquisa em português.

A qualidade das respostas automáticas depende directamente da informação existente na `knowledge_base`.

Como evolução futura, a pesquisa poderá utilizar **pgvector** e embeddings para melhorar a capacidade de encontrar respostas semanticamente semelhantes.

---

## Configuração

### Pré-requisitos

Antes de executar o projecto localmente, é necessário ter:

* Node.js
* npm
* Conta Supabase
* Chave de pelo menos um fornecedor de LLM

Os serviços opcionais são:

* Resend
* Twilio
* Upstash

---

### 1. Configurar o Supabase

Criar um projecto no Supabase.

No **SQL Editor**, executar pela seguinte ordem:

```text
supabase/schema.sql
supabase/policies.sql
supabase/seed.sql
```

O `seed.sql` é opcional.

Depois, em **Project Settings → API**, obter:

```text
Supabase URL
anon public key
service_role key
```

---

### 2. Criar o administrador inicial

Criar manualmente o primeiro utilizador através de:

```text
Authentication → Users → Add user
```

Depois, no SQL Editor:

```sql
UPDATE public.profiles
SET
    role = 'admin',
    full_name = 'O seu nome'
WHERE id = '<uuid do utilizador>';
```

A partir daí, o administrador pode gerir os restantes clientes e developers através da aplicação.

---

### 3. Configurar variáveis de ambiente

Criar o ficheiro `.env.local` a partir do exemplo:

```bash
cp .env.example .env.local
```

Preencher as variáveis com as credenciais reais.

O fornecedor de LLM é definido através de:

```env
LLM_PROVIDER=gemini
```

As restantes variáveis encontram-se documentadas no `.env.example`.

> **Importante:** nunca adicionar `.env.local` ao repositório Git.

---

## Execução local

Instalar as dependências:

```bash
npm install
```

Iniciar o servidor de desenvolvimento:

```bash
npm run dev
```

A aplicação ficará disponível em:

```text
http://localhost:3000
```

---

## Deploy

O projecto está preparado para deploy na **Vercel**.

### Processo

1. Importar o repositório na Vercel.
2. Configurar as mesmas variáveis de ambiente utilizadas localmente.
3. Definir o domínio de produção em `NEXT_PUBLIC_APP_URL`.
4. Configurar `ALLOWED_ORIGINS`.
5. Fazer o deploy.

---

## Variáveis de ambiente

Entre as principais configurações encontram-se:

```text
Supabase
LLM_PROVIDER
Gemini / Anthropic / OpenAI
Resend
Twilio
Upstash
ALLOWED_ORIGINS
NEXT_PUBLIC_APP_URL
```

As chaves devem permanecer exclusivamente no ambiente do servidor.

---

## Identidade visual

A aplicação utiliza uma identidade visual simples e profissional baseada nas cores da Vértice.

| Elemento      | Valor     |
| ------------- | --------- |
| Texto / marca | `#09182A` |
| Fundo         | `#F4F6F8` |
| Acento        | `#0F6E8C` |

As cores estão definidas em:

```text
tailwind.config.ts
```

através dos tokens:

```text
ink
surface
accent
```

---

## Roadmap

### WhatsApp

Actualmente as notificações WhatsApp estão desactivadas por omissão:

```env
WHATSAPP_NOTIFICATIONS_ENABLED=false
```

Para produção, é necessário configurar um número aprovado e cumprir os requisitos aplicáveis da Meta para mensagens fora da janela de 24 horas.

### Rate limiting

O rate limiting pode utilizar Upstash.

Sem:

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

a funcionalidade permanece inactiva.

É recomendado activá-la em produção.

### Pesquisa semântica

Evolução da pesquisa full-text PostgreSQL para:

```text
pgvector
    ↓
Embeddings
    ↓
Pesquisa semântica
```

A arquitectura actual permite manter esta alteração isolada no adapter responsável pelo acesso à base de conhecimento.

### Streaming

Actualmente a resposta da LLM é devolvida integralmente.

Uma evolução futura poderá implementar **streaming**, permitindo apresentar a resposta progressivamente, aproximando a experiência da utilização do ChatGPT.

### Base de conhecimento

A próxima etapa crítica é popular a `knowledge_base` com os procedimentos e informação reais da Vértice.

Quanto melhor for esta base de conhecimento, maior será a capacidade do sistema de responder automaticamente e menor será o número de tickets encaminhados para os developers.

---

## Princípios de desenvolvimento

O projecto segue alguns princípios fundamentais:

* Separação entre lógica de negócio e infraestrutura.
* Dependência de interfaces em vez de implementações concretas.
* Rotas API simples e sem lógica de negócio.
* Segredos exclusivamente no servidor.
* Validação de todos os inputs externos.
* Autorização baseada em papéis.
* Defesa em profundidade na segurança.
* Componentes externos isolados através de adapters.
* Facilidade de substituição de fornecedores.

---

## Estado do projecto

**Stack actual:** Next.js + TypeScript + Supabase/PostgreSQL + Tailwind CSS

**Deploy:** Vercel

**LLM predefinida:** Gemini

**LLMs suportadas:** Gemini, Anthropic Claude e OpenAI

**Notificações:** Resend + Twilio

**Arquitectura:** Ports & Adapters

**Autenticação:** Supabase Auth

**Autorização:** `client` / `dev` / `admin`

**Base de dados:** PostgreSQL com RLS

---

## Licença

Este projecto é uma aplicação interna desenvolvida para a **Vértice**.

A utilização, distribuição ou modificação do código deve respeitar as condições definidas pelos responsáveis pelo projecto.
