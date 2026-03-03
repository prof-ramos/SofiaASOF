# SOFIA API — Referência Técnica

**Versão:** 1.0
**Base URL (produção):** `https://<dominio>.vercel.app`
**Base URL (desenvolvimento):** `http://localhost:3000`
**Idioma das respostas:** Português brasileiro

---

## Índice

1. [Setup e deploy via CLI](#setup-e-deploy-via-cli)
   - [Pré-requisitos](#pré-requisitos)
   - [Supabase CLI](#supabase-cli)
   - [Vercel CLI](#vercel-cli)
   - [Setup automatizado](#setup-automatizado-npm-run-setup)
2. [Visão geral](#visão-geral)
3. [Autenticação](#autenticação)
4. [Endpoints HTTP](#endpoints-http)
   - [POST /api/chat](#post-apichat)
5. [Protocolo de streaming](#protocolo-de-streaming)
6. [Tipos de dados](#tipos-de-dados)
7. [RPC Supabase — match_documents](#rpc-supabase--match_documents)
8. [Script de ingestão](#script-de-ingestão-npm-run-ingest)
9. [Códigos de status e erros](#códigos-de-status-e-erros)
10. [Limites e restrições](#limites-e-restrições)
11. [Exemplos de integração](#exemplos-de-integração)

---

## Setup e deploy via CLI

Todo o ciclo de vida da SOFIA — criação do banco, configuração de variáveis de ambiente e deploy — pode ser executado exclusivamente via linha de comando, sem necessidade de acessar o dashboard do Supabase ou da Vercel.

### Pré-requisitos

Instale as CLIs globalmente:

```bash
npm install -g supabase vercel
```

Copie o template de variáveis de ambiente e preencha com suas chaves:

```bash
cp .env.local.example .env.local
# Edite .env.local com OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, etc.
```

---

### Supabase CLI

O schema do banco está versionado em `supabase/migrations/`. A CLI aplica as migrações diretamente no projeto remoto, sem necessidade de copiar e colar SQL no dashboard.

#### 1. Autenticar

```bash
supabase login
# Abre o browser para autenticação ou solicita token de acesso
```

#### 2. Vincular ao projeto remoto

```bash
# O project-ref é a parte inicial da URL do Supabase
# Ex.: https://abcxyz.supabase.co → project-ref = abcxyz
supabase link --project-ref <project-ref>
```

#### 3. Aplicar migrações

```bash
# Aplica todos os arquivos em supabase/migrations/ que ainda não foram aplicados
npm run db:push
# equivalente a: supabase db push
```

#### 4. Verificar estado das migrações

```bash
npm run db:status
# equivalente a: supabase migration list
# Exibe quais migrações foram aplicadas e quais estão pendentes
```

#### Adicionando novas migrações

Ao modificar o schema, crie um novo arquivo de migração:

```bash
# Nomear com timestamp ISO + descrição
# Ex.: supabase/migrations/20260401120000_add_feedback_table.sql
touch supabase/migrations/$(date +%Y%m%d%H%M%S)_descricao.sql
# Edite o arquivo com o SQL da alteração e aplique:
npm run db:push
```

#### Migrações disponíveis

| Arquivo | Conteúdo |
|---|---|
| `20260303000000_initial.sql` | pgvector, tabela `documents`, índice HNSW, função `match_documents`, RLS, tabela `chat_sessions` |

---

### Vercel CLI

#### 1. Autenticar

```bash
vercel login
# Abre o browser ou solicita email/token
```

#### 2. Vincular ao projeto Vercel

```bash
vercel link
# Associa o diretório local a um projeto existente ou cria um novo
```

#### 3. Configurar variáveis de ambiente

Adicione cada variável para todos os ambientes (production, preview, development):

```bash
# Sintaxe: echo "valor" | vercel env add NOME ambiente
echo "$OPENAI_API_KEY"                  | vercel env add OPENAI_API_KEY production
echo "$OPENAI_API_KEY"                  | vercel env add OPENAI_API_KEY preview
echo "$OPENAI_API_KEY"                  | vercel env add OPENAI_API_KEY development

echo "$NEXT_PUBLIC_SUPABASE_URL"        | vercel env add NEXT_PUBLIC_SUPABASE_URL production
echo "$NEXT_PUBLIC_SUPABASE_URL"        | vercel env add NEXT_PUBLIC_SUPABASE_URL preview
echo "$NEXT_PUBLIC_SUPABASE_URL"        | vercel env add NEXT_PUBLIC_SUPABASE_URL development

echo "$NEXT_PUBLIC_SUPABASE_ANON_KEY"   | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
echo "$NEXT_PUBLIC_SUPABASE_ANON_KEY"   | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview
echo "$NEXT_PUBLIC_SUPABASE_ANON_KEY"   | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY development

echo "$SUPABASE_SERVICE_ROLE_KEY"       | vercel env add SUPABASE_SERVICE_ROLE_KEY production
echo "$SUPABASE_SERVICE_ROLE_KEY"       | vercel env add SUPABASE_SERVICE_ROLE_KEY preview
echo "$SUPABASE_SERVICE_ROLE_KEY"       | vercel env add SUPABASE_SERVICE_ROLE_KEY development

# Opcional: Portal da Transparência
echo "$PORTAL_TRANSPARENCIA_API_KEY"    | vercel env add PORTAL_TRANSPARENCIA_API_KEY production
```

Verificar variáveis configuradas:

```bash
vercel env ls
```

Puxar variáveis do Vercel para o `.env.local` local (útil para sincronizar equipe):

```bash
vercel env pull .env.local
```

#### 4. Deploy

```bash
# Deploy de preview (URL temporária para teste)
npm run deploy:prev
# equivalente a: vercel

# Deploy em produção
npm run deploy:prod
# equivalente a: vercel --prod
```

#### 5. Verificar logs em produção

```bash
# Listar deployments recentes
vercel ls

# Ver logs de uma função específica
vercel logs <deployment-url>
```

---

### Setup automatizado (`npm run setup`)

O script `scripts/setup.sh` executa todo o fluxo acima em sequência:

1. Valida pré-requisitos (Node, Supabase CLI, Vercel CLI)
2. Valida `.env.local` (verifica variáveis obrigatórias)
3. `npm install`
4. `supabase login` + `supabase link` + `supabase db push`
5. `vercel login` + `vercel link`
6. Configura todas as variáveis de ambiente nos três ambientes Vercel
7. `vercel --prod` (deploy em produção)
8. `npm run ingest` (se houver documentos em `/docs/`)

```bash
# Pré-requisito: .env.local preenchido
npm run setup
```

Cada etapa exibe feedback colorido e para imediatamente em caso de erro (`set -euo pipefail`).

---

## Visão geral

A SOFIA expõe um único endpoint HTTP público para o chat. Internamente, cada requisição dispara um pipeline RAG:

```
Cliente → POST /api/chat
           │
           ├─ 1. Extrai texto da última mensagem do usuário
           ├─ 2. Gera embedding via OpenAI text-embedding-3-small (1536 dims)
           ├─ 3. Busca vetorial no Supabase pgvector (cosine similarity)
           ├─ 4. Monta system prompt + chunks recuperados como contexto
           ├─ 5. Chama OpenAI GPT-4o via Vercel AI SDK
           └─ 6. Retorna UIMessageStream (SSE) ao cliente
```

---

## Autenticação

O endpoint `/api/chat` é **público** no MVP — não requer token de autenticação.

As credenciais (OpenAI API Key, Supabase Service Role Key) são mantidas exclusivamente em variáveis de ambiente no servidor e nunca expostas ao cliente.

| Variável de ambiente          | Escopo        | Obrigatória |
|-------------------------------|---------------|-------------|
| `OPENAI_API_KEY`              | Servidor      | Sim         |
| `NEXT_PUBLIC_SUPABASE_URL`    | Cliente + Srv | Sim         |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente     | Sim         |
| `SUPABASE_SERVICE_ROLE_KEY`   | Servidor      | Sim (ingestão) |
| `PORTAL_TRANSPARENCIA_API_KEY` | Servidor     | Não (futuro)|

---

## Endpoints HTTP

### `POST /api/chat`

Endpoint principal da SOFIA. Recebe o histórico de mensagens e retorna a resposta gerada pelo LLM em streaming, com contexto RAG injetado automaticamente.

**URL:** `POST /api/chat`
**Content-Type:** `application/json`
**Timeout máximo:** 30 segundos (Vercel Free)
**Resposta:** `text/event-stream` (Server-Sent Events — UIMessageStream)

---

#### Corpo da requisição

```json
{
  "id": "string (opcional — ID da sessão de chat)",
  "messages": [
    {
      "id": "string",
      "role": "user" | "assistant",
      "parts": [
        {
          "type": "text",
          "text": "string"
        }
      ]
    }
  ]
}
```

| Campo              | Tipo     | Obrigatório | Descrição |
|--------------------|----------|-------------|-----------|
| `id`               | `string` | Não         | Identificador da sessão. Gerado automaticamente pelo `DefaultChatTransport` se omitido. |
| `messages`         | `UIMessage[]` | Sim    | Histórico completo da conversa (todas as mensagens, usuário e assistente). |
| `messages[].id`    | `string` | Sim         | ID único da mensagem. |
| `messages[].role`  | `"user"` \| `"assistant"` | Sim | Papel do remetente. |
| `messages[].parts` | `UIMessagePart[]` | Sim  | Partes do conteúdo. No MVP, apenas `type: "text"` é utilizado. |

**Observação sobre o formato `messages`:** O endpoint usa o formato `UIMessage` do Vercel AI SDK v6, não o formato legado `{ role, content: string }`. O `DefaultChatTransport` no cliente serializa as mensagens automaticamente neste formato.

---

#### Resposta (sucesso — HTTP 200)

A resposta é transmitida como um fluxo SSE no protocolo UIMessageStream do Vercel AI SDK v6.

**Headers da resposta:**

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

**Formato do stream (SSE):**

Cada evento SSE segue o padrão `data: <JSON>\n\n`. Os tipos de chunk mais relevantes:

```
# Início da mensagem
data: {"type":"message-start","messageId":"msg_abc123"}

# Delta de texto (gerado progressivamente)
data: {"type":"text-delta","textDelta":"Nos termos do art. 14"}
data: {"type":"text-delta","textDelta":" da Lei nº 11.440/2006..."}

# Fim da mensagem
data: {"type":"message-stop"}

# Fim do stream
data: [DONE]
```

---

#### Exemplo de requisição

**cURL:**

```bash
curl -X POST https://<dominio>.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "id": "msg-1",
        "role": "user",
        "parts": [
          {
            "type": "text",
            "text": "Quais são os requisitos para promoção ao padrão seguinte na carreira de Oficial de Chancelaria?"
          }
        ]
      }
    ]
  }'
```

**JavaScript (Fetch com streaming):**

```javascript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        parts: [{ type: 'text', text: 'O que é a ASOF?' }]
      }
    ]
  })
})

const reader = response.body.getReader()
const decoder = new TextDecoder()

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  const chunk = decoder.decode(value)
  console.log(chunk) // Processa os eventos SSE
}
```

**Uso recomendado — Vercel AI SDK (`@ai-sdk/react`):**

```typescript
// components/MeuChat.tsx
'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useMemo, useState } from 'react'

export function MeuChat() {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: '/api/chat' }),
    []
  )
  const { messages, sendMessage, status } = useChat({ transport })
  const [input, setInput] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const text = input
    setInput('')
    await sendMessage({ text })
  }

  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id}>
          <strong>{msg.role}:</strong>{' '}
          {msg.parts.filter(p => p.type === 'text').map(p => p.text).join('')}
        </div>
      ))}

      <form onSubmit={handleSubmit}>
        <input value={input} onChange={e => setInput(e.target.value)} />
        <button disabled={status === 'streaming' || status === 'submitted'}>
          Enviar
        </button>
      </form>
    </div>
  )
}
```

---

#### Comportamento do pipeline RAG

Na etapa de busca vetorial, o endpoint:

1. Extrai o texto da última mensagem com `role: "user"` no array `messages`.
2. Gera um embedding de 1536 dimensões via `text-embedding-3-small`.
3. Consulta a função `match_documents` no Supabase com:
   - `match_threshold`: `0.5` (similaridade mínima de cosseno)
   - `match_count`: `5` (máximo de chunks recuperados)
4. Os chunks recuperados são injetados no system prompt antes da chamada ao LLM.

Se nenhum chunk superar o threshold de similaridade, a SOFIA responde somente com o conhecimento parametrizado no system prompt.

---

#### Resposta de fallback (fora do escopo)

Quando a pergunta está fora do escopo da carreira de Oficial de Chancelaria ou do Serviço Exterior Brasileiro, a SOFIA responde com redirecionamento adequado, sem erro HTTP:

```
HTTP 200 OK
(stream SSE com texto de redirecionamento)

Exemplo de conteúdo:
"Esta questão está além do escopo atual da SOFIA. Para orientação
especializada, recomendo contatar a Assessoria Jurídica da ASOF ou
consultar diretamente o órgão competente."
```

---

## Protocolo de streaming

A SOFIA utiliza o **UIMessageStream** do Vercel AI SDK v6, transportado via **Server-Sent Events (SSE)**. O `DefaultChatTransport` no cliente gerencia a conexão, deserialização e atualização de estado automaticamente.

### Status do cliente (`ChatStatus`)

O hook `useChat` expõe o estado atual via propriedade `status`:

| Status      | Descrição |
|-------------|-----------|
| `ready`     | Aguardando nova mensagem do usuário. |
| `submitted` | Mensagem enviada; aguardando início da resposta. |
| `streaming` | Recebendo chunks de texto do servidor. |
| `error`     | Erro na requisição. Consultar `error` para detalhes. |

### Controle de fluxo

```typescript
const { sendMessage, stop, status, error } = useChat({ transport })

// Interromper geração em andamento
stop()

// Verificar erro
if (status === 'error') {
  console.error(error?.message)
}
```

---

## Tipos de dados

### `UIMessage`

Formato de mensagem do Vercel AI SDK v6, utilizado no array `messages` da requisição.

```typescript
interface UIMessage {
  id: string
  role: 'user' | 'assistant'
  parts: UIMessagePart[]
  metadata?: unknown
}
```

### `UIMessagePart` (variantes relevantes)

```typescript
// Parte de texto — único tipo usado no MVP
interface TextUIPart {
  type: 'text'
  text: string
}
```

### `Source` (interno — RAG)

Resultado de cada chunk recuperado do Supabase antes de ser injetado no prompt.

```typescript
interface Source {
  title: string      // Título do documento (ex.: "Lei nº 11.440/2006")
  content: string    // Texto do chunk (até 1.000 caracteres)
  similarity: number // Similaridade de cosseno [0, 1]
}
```

### `DocumentChunk` (tabela `documents` no Supabase)

```typescript
interface DocumentChunk {
  id: bigint
  content: string
  metadata: {
    source: string       // Nome do arquivo original
    title: string        // Título legível do documento
    chunkIndex: number   // Posição do chunk no documento
    totalChunks: number  // Total de chunks do documento
  }
  embedding: number[]    // Vetor de 1536 dimensões
  created_at: string     // ISO 8601
}
```

---

## RPC Supabase — `match_documents`

Função PostgreSQL chamada internamente por `lib/rag.ts` para realizar a busca semântica.

**Não é um endpoint HTTP público**, mas pode ser chamada diretamente via Supabase client se necessário.

### Assinatura

```sql
match_documents(
  query_embedding  vector(1536),
  match_threshold  float  DEFAULT 0.7,
  match_count      int    DEFAULT 5
)
RETURNS TABLE (
  id          bigint,
  content     text,
  metadata    jsonb,
  similarity  float
)
```

### Uso via Supabase JS client

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const { data, error } = await supabase.rpc('match_documents', {
  query_embedding: embedding,  // number[] com 1536 elementos
  match_threshold: 0.5,
  match_count: 5,
})
```

### Retorno

```json
[
  {
    "id": 42,
    "content": "Art. 14. A progressão funcional...",
    "metadata": {
      "source": "lei-11440-2006.txt",
      "title": "Lei nº 11.440/2006 — Serviço Exterior Brasileiro",
      "chunkIndex": 7,
      "totalChunks": 43
    },
    "similarity": 0.873
  }
]
```

### Parâmetros recomendados por caso de uso

| Caso de uso                | `match_threshold` | `match_count` |
|----------------------------|-------------------|---------------|
| Chat (padrão)              | 0.5               | 5             |
| Busca precisa (legislação) | 0.7               | 3             |
| Exploração ampla           | 0.4               | 8             |

---

## Script de ingestão (`npm run ingest`)

Utilitário de linha de comando para popular a tabela `documents` no Supabase com chunks dos documentos legislativos.

**Não é um endpoint HTTP.** Executado apenas em ambiente de desenvolvimento ou CI.

### Uso

```bash
# Processar todos os documentos configurados em /docs
npm run ingest

# Processar um arquivo específico
npm run ingest -- --file=docs/lei-11440-2006.txt
```

### Configuração de chunking

| Parâmetro      | Valor padrão | Descrição |
|----------------|--------------|-----------|
| `CHUNK_SIZE`   | 1.000 chars  | Tamanho máximo de cada chunk. |
| `CHUNK_OVERLAP`| 200 chars    | Sobreposição entre chunks consecutivos para preservar contexto. |
| `BATCH_SIZE`   | 10           | Chunks enviados por requisição à API de embeddings. |

### Documentos suportados (configuração padrão)

| Arquivo esperado em `/docs/`         | Norma indexada |
|--------------------------------------|----------------|
| `lei-11440-2006.txt`                 | Lei nº 11.440/2006 |
| `decreto-9817-2019.txt`              | Decreto nº 9.817/2019 |
| `lei-8112-1990.txt`                  | Lei nº 8.112/1990 |
| `lei-8027-1990.txt`                  | Lei nº 8.027/1990 |
| `decreto-1171-1994.txt`              | Decreto nº 1.171/1994 |
| `decreto-7133-2010.txt`              | Decreto nº 7.133/2010 |
| `lei-12527-2011.txt`                 | Lei nº 12.527/2011 |
| `decreto-7724-2012.txt`              | Decreto nº 7.724/2012 |
| `decreto-6134-2007.txt`              | Decreto nº 6.134/2007 |
| `manual-redacao-itamaraty-2024.txt`  | Manual de Redação do Itamaraty |
| `manual-redacao-presidencia.txt`     | Manual de Redação da Presidência |
| `estatuto-asof.txt`                  | Estatuto da ASOF |

Arquivos ausentes são ignorados com aviso (`⚠️`). Os demais documentos são processados normalmente.

### Saída esperada

```
🤖 SOFIA — Pipeline de Ingestão de Documentos
══════════════════════════════════════════════════
📁 Processando documentos em: /home/user/SofiaASOF/docs

  📄 Processando: Lei nº 11.440/2006 — Serviço Exterior Brasileiro
     43 chunks gerados
     Lote 5/5 ✓
     ✅ Concluído: 43 chunks inseridos

  ⚠️  Arquivo não encontrado: estatuto-asof.txt — ignorando.

✅ Ingestão concluída com sucesso!
   A base de conhecimento da SOFIA está atualizada.
```

---

## Validação de entrada (Zod)

O endpoint `/api/chat` utiliza **Zod v3.24.1** para validar todas as requisições antes do processamento.

### Schema de validação

```typescript
// lib/validation/schemas.ts
ChatRequestSchema = z.object({
  messages: z.array(MessageSchema)
    .min(1, 'Ao menos uma mensagem é obrigatória')
    .max(50, 'Máximo de 50 mensagens por requisição')
})

MessageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(['user', 'assistant', 'system']),
  parts: z.array(MessagePartSchema)
    .min(1)
    .max(20)
})
```

### Limites validados

| Campo | Limite | Erro HTTP |
|-------|--------|-----------|
| `messages` | 1-50 mensagens | `400` |
| `parts` por mensagem | 1-20 partes | `400` |
| `text` por parte | 10.000 caracteres | `400` |

### Resposta de validação (HTTP 400)

```json
{
  "error": "Dados inválidos",
  "details": [
    {
      "path": "messages.0.parts.0.text",
      "message": "Mensagem muito longa (máximo 10.000 caracteres)"
    }
  ]
}
```

### Tipos suportados

| Tipo | Descrição |
|------|-----------|
| `text` | Partes de texto (único tipo no MVP) |
| `image` | Partes de imagem (reservado para futuro) |
| `data` | Partes de dados genéricos (tool calls, etc) |
| `tool-call` | Chamadas de ferramentas |
| `tool-result` | Resultados de ferramentas |

---

## Códigos de status e erros

### HTTP

| Código | Situação |
|--------|----------|
| `200`  | Sucesso — stream SSE iniciado. |
| `400`  | Corpo da requisição inválido (JSON malformado ou `messages` ausente). |
| `500`  | Erro interno do servidor (falha na API OpenAI, Supabase indisponível, etc.). |
| `504`  | Gateway timeout — o Vercel encerrou a conexão após 30 s. |

### Erros do pipeline RAG

Falhas na busca vetorial (Supabase indisponível, embedding inválido) são tratadas silenciosamente: `retrieveContext` retorna `[]` e a SOFIA responde sem contexto externo, usando apenas o conhecimento do LLM.

```typescript
// lib/rag.ts — tratamento de erro
if (error) {
  console.error('Erro na busca vetorial:', error)
  return []  // degrada graciosamente; o chat continua funcionando
}
```

### Erros do cliente (`useChat`)

```typescript
const { error, status } = useChat({ transport })

if (status === 'error') {
  // error.message contém a descrição do problema
  // Ex.: "Failed to fetch", "HTTP 500", etc.
}
```

---

## Limites e restrições

### Operacionais

| Limite | Valor | Fonte |
|--------|-------|-------|
| Timeout máximo da API route | 30 s | `vercel.json` + Vercel Free |
| Máximo de chunks RAG por consulta | 5 | `lib/rag.ts` (`matchCount`) |
| Threshold mínimo de similaridade | 0.5 (cosseno) | `lib/rag.ts` (`matchThreshold`) |
| Dimensão dos vetores | 1.536 | `text-embedding-3-small` |
| Tamanho máximo do banco (Supabase Free) | 500 MB | Plano Supabase Free |

### Escopo da SOFIA

- Responde exclusivamente sobre a **carreira de Oficial de Chancelaria** e o **Serviço Exterior Brasileiro**.
- **Não emite pareceres jurídicos vinculantes.**
- **Não acessa sistemas internos do MRE** (SGEP, SIAPE, SEI, Intratec).
- **Não armazena dados pessoais** de usuários no MVP.
- Não tem acesso a informações em tempo real; o conhecimento reflete o estado da legislação até a data de corte do modelo OpenAI e a data da última ingestão.

### Restrição lexical do sistema

O system prompt veda o uso da palavra **"diplomacia"** para referir-se ao Serviço Exterior Brasileiro. A SOFIA usa exclusivamente "Serviço Exterior Brasileiro", "serviço exterior" ou expressão equivalente.

### Rate limiting

Não há rate limiting implementado no MVP. O custo é absorvido diretamente pelas APIs:

- **OpenAI (embeddings):** por consulta de chat + por chunk na ingestão.
- **OpenAI (GPT-4o):** por token de entrada e saída em cada resposta.
- **Supabase:** sem custo adicional para chamadas RPC dentro do plano Free.

---

## Exemplos de integração

### Integração com React (padrão do projeto)

```typescript
// Uso completo do hook useChat com o DefaultChatTransport
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useMemo, useState, type FormEvent } from 'react'

function Chat() {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: '/api/chat' }),
    []
  )

  const { messages, sendMessage, status, setMessages, stop } = useChat({ transport })
  const [input, setInput] = useState('')

  const isLoading = status === 'submitted' || status === 'streaming'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    const text = input
    setInput('')
    await sendMessage({ text })
  }

  // Extrair texto de um UIMessage
  const getText = (msg: typeof messages[0]) =>
    msg.parts.filter(p => p.type === 'text').map(p => p.text).join('')

  return (
    <>
      {messages.map(msg => (
        <p key={msg.id}>
          <b>{msg.role}:</b> {getText(msg)}
        </p>
      ))}

      {isLoading && <button onClick={stop}>Interromper</button>}

      <form onSubmit={handleSubmit}>
        <input value={input} onChange={e => setInput(e.target.value)} />
        <button type="submit" disabled={isLoading}>Enviar</button>
      </form>

      <button onClick={() => setMessages([])}>Nova conversa</button>
    </>
  )
}
```

### Requisição direta via Python

```python
import httpx
import json

url = "https://<dominio>.vercel.app/api/chat"
payload = {
    "messages": [
        {
            "id": "msg-001",
            "role": "user",
            "parts": [
                {
                    "type": "text",
                    "text": "Quais são as etapas do concurso para Oficial de Chancelaria?"
                }
            ]
        }
    ]
}

with httpx.Client(timeout=30.0) as client:
    with client.stream("POST", url, json=payload) as response:
        for line in response.iter_lines():
            if line.startswith("data:"):
                data = line[5:].strip()
                if data == "[DONE]":
                    break
                try:
                    chunk = json.loads(data)
                    if chunk.get("type") == "text-delta":
                        print(chunk["textDelta"], end="", flush=True)
                except json.JSONDecodeError:
                    pass
```

### Ingestão de novo documento via script

```bash
# Converter PDF para texto (pré-requisito externo)
pdftotext portaria-mre-123-2025.pdf docs/portaria-mre-123-2025.txt

# Ingerir o arquivo convertido
npm run ingest -- --file=docs/portaria-mre-123-2025.txt
```

---

*Documentação gerada em março de 2026. Mantenha sincronizada com as alterações em `app/api/chat/route.ts` e `lib/rag.ts`.*
