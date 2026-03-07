# CLAUDE.md

Este arquivo fornece orientação ao Claude Code (claude.ai/code) ao trabalhar com código neste repositório.

## Visão Geral

SOFIA (Suporte Orientado às Funções e Interesses dos Associados) é um agente de IA da ASOF — Associação Nacional dos Oficiais de Chancelaria do Serviço Exterior Brasileiro. É um chatbot com RAG (Retrieval Augmented Generation) para orientar Oficiais de Chancelaria sobre a carreira, direitos, deveres e procedimentos funcionais.

**Stack principal:** Next.js (Vercel) + Vercel AI SDK + OpenAI (GPT-4o) + Supabase pgvector

## Comandos Importantes

### Desenvolvimento
```bash
npm run dev          # Inicia servidor de desenvolvimento (http://localhost:3000)
npm run build        # Build de produção
npm run start        # Inicia servidor de produção
npm run lint         # Executa ESLint
```

### Testes
```bash
npm run test:metrics     # Testa SDK de métricas
vitest                   # Executa todos os testes (Vitest)
vitest --ui              # Executa testes com interface visual
```

### Ingestão de Documentos
```bash
npm run ingest              # Processa todos os documentos em /docs
npm run ingest -- --file=caminho/arquivo.txt  # Processa arquivo específico
```

### Migrações e Setup
```bash
npm run db:push            # Aplica migrações do Supabase
npm run db:status          # Lista status das migrações
npm run migrate            # Executa script de migração
npm run setup              # Script de setup completo
npm run validate           # Valida métricas
```

### Scripts de Métricas
```bash
npm run setup:metrics      # Configura SDK de métricas
```

## Arquitetura

### Fluxo RAG (Retrieval Augmented Generation)

```
Usuário digita pergunta
        ↓
/api/chat (API Route Next.js)
        ↓
1. Rate limiting (20 req/min por IP)
2. Validação Zod do payload
3. Gera embedding da pergunta (OpenAI text-embedding-3-small)
4. Busca vetorial no Supabase pgvector (RPC: sofia_match_documents)
5. Recupera chunks relevantes (top 5, threshold 0.5)
6. Monta prompt com contexto + system prompt da SOFIA
7. Chama OpenAI via Vercel AI SDK (GPT-4o)
8. Streaming da resposta ao usuário
```

### Estrutura de Diretórios

```
├── app/
│   ├── api/chat/route.ts         # Endpoint principal do chat (RAG + streaming)
│   ├── page.tsx                  # Home page (lazy load do ChatInterface)
│   └── metrics/page.tsx          # Dashboard de métricas (interno)
│
├── components/
│   ├── chat/                     # Componentes da interface de chat
│   │   ├── ChatInterface.tsx     # Container principal com useChat()
│   │   ├── MessageList.tsx       # Lista de mensagens com scroll
│   │   ├── MessageItem.tsx       # Item individual de mensagem
│   │   ├── MarkdownRenderer.tsx  # Renderizador de markdown
│   │   ├── ChatInput.tsx         # Input de chat com textarea
│   │   └── WelcomeScreen.tsx     # Tela de boas-vindas
│   └── ui/                       # Componentes shadcn/ui
│
├── lib/
│   ├── system-prompt.ts          # System prompt da SOFIA (personalidade, regras)
│   ├── rag.ts                    # Funções de RAG (retrieveContext, buildContextPrompt)
│   ├── supabase.ts               # Clientes Supabase (público e admin)
│   ├── rate-limit.ts             # Rate limiting in-memory
│   ├── metrics.ts                # Sistema de métricas (tokens, custos, latência)
│   ├── metrics-middleware.ts     # Middleware de métricas para API routes
│   └── validation/
│       ├── schemas.ts            # Schemas Zod para validação de requests
│       └── __tests__/            # Testes de validação
│
├── scripts/
│   ├── ingest.ts                 # Pipeline de ingestão de documentos
│   ├── quick-setup.ts            # Setup rápido do projeto
│   └── *metrics*.ts              # Scripts de setup/validação de métricas
│
├── supabase/
│   └── migrations/
│       └── 20260303000000_initial.sql  # Schema inicial (pgvector, tabelas, RPCs)
│
└── docs/                         # Documentos para ingestão (leis, decretos, etc.)
```

### Tabelas Supabase Importantes

- `sofia_documents` - Chunks de documentos indexados com embeddings (VECTOR 1536)
- `sofia_chat_sessions` - Sessões de chat (para futura auth)
- `sofia_message_metrics` - Métricas de uso (tokens, latência, custos)
- `sofia_dashboard` - View agregada para dashboard

### RPCs (Remote Procedures) Supabase

- `sofia_match_documents(query_embedding, match_threshold, match_count)` - Busca vetorial
- `sofia_log_message_metrics(...)` - Registra métricas de uma mensagem

## Padrões e Convenções

### Validação de Requests

Sempre validar o payload com Zod antes de processar. Use `safeValidateChatRequest()` de `@/lib/validation/schemas`:

```typescript
import { safeValidateChatRequest } from '@/lib/validation/schemas'

const validationResult = safeValidateChatRequest(requestBody)
if (!validationResult.success) {
  return new Response(JSON.stringify({ error: 'Dados inválidos', details: formattedErrors }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' }
  })
}
```

### Error Handling e Degradação Graciosa

O sistema deve continuar funcionando mesmo quando componentes falham:

- **RAG falha:** Retorna array vazio, continua sem contexto
- **Embedding falha:** Loga erro, retorna chunks vazios
- **Supabase RPC falha:** Loga erro, retorna array vazio

Exemplo em `app/api/chat/route.ts`:

```typescript
const ragPromise = retrieveContext(query).catch((error) => {
  console.error('[RAG ERROR]: Context retrieval failed, proceeding without context:', error)
  return [] // Degradação graciosa
})
```

### Rate Limiting

Rate limiting in-memory (adequado para Vercel Free):

```typescript
import { rateLimit } from '@/lib/rate-limit'

const rateCheck = rateLimit(clientId, { interval: 60000, limit: 20 })

if (rateCheck.isRateLimited) {
  return new Response(JSON.stringify({ error: 'Limite excedido' }), {
    status: 429,
    headers: { 'Retry-After': String(Math.ceil((rateCheck.reset - Date.now()) / 1000)) }
  })
}
```

### Streaming com Vercel AI SDK

O chat usa streaming para respostas em tempo real:

```typescript
import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
const result = streamText({
  model: openai('gpt-4o'),
  system: SYSTEM_PROMPT,
  messages: modelMessages,
})

return result.toUIMessageStreamResponse()
```

### System Prompt da SOFIA

O system prompt define a personalidade da SOFIA. Características importantes:

- **Nunca usar a palavra "diplomacia"** - usar "Serviço Exterior Brasileiro"
- Tom formal, compatível com o padrão MRE
- Citar dispositivos legais quando aplicável (ex: "art. 57 da Lei nº 11.440/2006")
- Não emitir pareceres jurídicos vinculantes
- Reconhecer limites e encaminhar para Assessoria Jurídica quando necessário

## Ingestão de Documentos

1. Coloque documentos `.txt` em `/docs/` (organizado em subpastas)
2. Execute `npm run ingest`
3. O script:
   - Lê todos os `.txt` recursivamente
   - Divide em chunks de 1000 caracteres com 200 de sobreposição
   - Gera embeddings via OpenAI text-embedding-3-small
   - Insere na tabela `sofia_documents` do Supabase

## Variáveis de Ambiente

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Opcional - Portal da Transparência (MCP)
PORTAL_TRANSPARENCIA_API_KEY=...
```

## Testes

Testes usam Vitest com jsdom. Mock o Supabase para evitar inicialização:

```typescript
vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: vi.fn() },
}))
```

## Observações Importantes

- O sistema de métricas (`lib/metrics.ts`) é completo mas opcional no fluxo principal
- A função RPC correta é `sofia_match_documents` (não `match_documents` genérico)
- Paralelização é usada em vários pontos (RAG + conversão de mensagens)
- `maxDuration = 30` no endpoint /api/chat (limite da Vercel Free)
