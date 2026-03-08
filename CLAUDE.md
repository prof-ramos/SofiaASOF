# CLAUDE.md

Este arquivo fornece orientação ao Claude Code (claude.ai/code) ao trabalhar com código neste repositório.

## Visão Geral

SOFIA (Suporte Orientado às Funções e Interesses dos Associados) é um agente de IA da ASOF — Associação Nacional dos Oficiais de Chancelaria do Serviço Exterior Brasileiro. É um chatbot com RAG (Retrieval Augmented Generation) para orientar Oficiais de Chancelaria sobre a carreira, direitos, deveres e procedimentos funcionais.

**Stack principal:** Next.js 16 (App Router, Vercel) + Vercel AI SDK v3 + OpenAI GPT-4o + Supabase pgvector

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
vitest               # Executa todos os testes (98 testes, Vitest + jsdom)
vitest --ui          # Executa testes com interface visual
npm run test:metrics # Testa SDK de métricas especificamente
```

### Ingestão de Documentos
```bash
npm run ingest                                # Processa todos os documentos em /docs
npm run ingest -- --file=caminho/arquivo.txt  # Processa arquivo específico
```

### Migrações e Setup
```bash
npm run db:push       # Aplica migrações do Supabase
npm run db:status     # Lista status das migrações
npm run migrate       # Executa script de migração manual
npm run setup         # Script de setup completo (quick-setup.ts)
npm run validate      # Valida configuração de métricas
npm run setup:metrics # Configura SDK de métricas
```

## Arquitetura

### Fluxo RAG (Retrieval Augmented Generation)

```
Usuário digita pergunta
        ↓
middleware.ts (Next.js middleware — rate limiting por IP, headers X-RateLimit-*)
        ↓
/api/chat (API Route Next.js)
        ↓
1. Rate limiting in-memory (20 req/min por IP via lib/rate-limit.ts)
2. Validação Zod do payload (ChatRequestSchema, max 50 msgs, max 10.000 chars/msg)
3. Paralelização: gera embedding + converte mensagens simultaneamente
4. Embedding da pergunta (OpenAI text-embedding-3-small, 1536 dim)
5. Busca vetorial no Supabase pgvector (RPC: sofia_match_documents)
   - Threshold: 0.7 (somente chunks altamente relevantes)
   - Top: 8 chunks
6. Re-ranking heurístico (lib/rag-rerank.ts)
   - Bônus por correspondência de palavras-chave
   - Penalidade por tamanho inadequado
   - Pontuação por posição
7. Otimização dinâmica de contexto (lib/context-optimizer.ts)
   - Limite: 2000 tokens (~4 chars/token para português)
   - Mínimo 3 chunks, máximo 5 chunks
   - Diversidade: máx 2 chunks por documento-fonte
8. Monta prompt com contexto + system prompt da SOFIA
9. Chama OpenAI via Vercel AI SDK (GPT-4o, streaming)
10. Streaming da resposta ao usuário (toUIMessageStreamResponse)
```

### Estrutura de Diretórios

```
├── app/
│   ├── api/
│   │   ├── chat/route.ts          # Endpoint principal do chat (RAG + streaming)
│   │   └── metrics/               # 4 rotas de métricas (stats, dashboard, sessions, export)
│   ├── metrics/page.tsx           # Dashboard de métricas (interno)
│   ├── test-connection/page.tsx   # Página de teste de conexão DB
│   ├── layout.tsx                 # Layout raiz com metadados
│   └── page.tsx                   # Home page (lazy load do ChatInterface + ErrorBoundary)
│
├── components/
│   ├── chat/
│   │   ├── ChatInterface.tsx      # Container principal com useChat() e tratamento de erros
│   │   ├── MessageList.tsx        # Lista de mensagens com scroll automático
│   │   ├── MessageItem.tsx        # Item individual de mensagem
│   │   ├── MarkdownRenderer.tsx   # Renderizador de markdown com highlight.js
│   │   ├── ChatInput.tsx          # Input de chat com textarea
│   │   └── WelcomeScreen.tsx      # Tela de boas-vindas
│   ├── ui/                        # Componentes shadcn/ui (badge, avatar, button, card,
│   │                              #   scroll-area, input, textarea, separator)
│   └── ErrorBoundary.tsx          # Error boundary React
│
├── lib/
│   ├── rag.ts                     # Core RAG: generateEmbedding, retrieveContext, buildContextPrompt
│   ├── rag-rerank.ts              # Re-ranking heurístico (+ stub para cross-encoder)
│   ├── context-optimizer.ts       # Otimização dinâmica de contexto por tokens
│   ├── system-prompt.ts           # System prompt da SOFIA (~2000 tokens, personalidade + regras)
│   ├── supabase.ts                # Clientes Supabase (público anon + admin service role)
│   ├── rate-limit.ts              # Rate limiting in-memory (Map, sem dependências externas)
│   ├── metrics.ts                 # Contagem de tokens (tiktoken), preços, logging de métricas
│   ├── metrics-middleware.ts      # Contexto de sessão, hash de IP, finalização de métricas
│   ├── logger.ts                  # Logger ciente de ambiente (silenciado em produção, exceto erros)
│   ├── utils.ts                   # Funções utilitárias gerais
│   ├── validation/
│   │   ├── schemas.ts             # Schemas Zod para requests de chat (8 validadores)
│   │   └── __tests__/schemas.test.ts
│   └── __tests__/
│       ├── rag.test.ts
│       ├── rag-rerank.test.ts
│       ├── rag-integration.test.ts
│       ├── context-optimizer.test.ts
│       └── fixtures/              # Mock data determinístico para testes
│
├── scripts/
│   ├── ingest.ts                  # Pipeline de ingestão (chunk 1000 chars, overlap 200, batch 10)
│   ├── quick-setup.ts             # Setup automatizado do projeto
│   ├── run-migration.ts           # Aplicação manual de migrações
│   ├── setup-supabase.ts          # Criação do projeto Supabase
│   └── *metrics*.ts               # Scripts de setup/validação/teste de métricas
│
├── supabase/
│   └── migrations/
│       ├── 20260303000000_initial.sql       # Schema principal (pgvector, documentos, RPC)
│       └── 20260307000001_rate_limiting.sql # Tabela de rate limiting no Supabase
│
├── types/
│   └── index.ts                   # Interfaces Source, DocumentChunk
│
├── docs/                          # Documentos para ingestão
│   ├── leis/                      # Lei 11.440/2006, Lei 8.112/1990, Lei 8.829/1993, etc.
│   ├── decretos/                  # Decretos 11357, 93325, 1565, 1171
│   └── convencoes/                # Convenções de Viena e asilo diplomático
│
├── middleware.ts                  # Next.js middleware: rate limiting e headers X-RateLimit-*
├── test-setup.ts                  # Setup global Vitest (mocks)
├── vitest.config.ts               # Configuração Vitest (jsdom, path aliases)
├── next.config.ts                 # Next.js config (tiktoken como pacote externo — WASM)
├── vercel.json                    # Configuração de deployment na Vercel
└── .env.local.example             # Template de variáveis de ambiente
```

### Tabelas Supabase

| Tabela | Descrição |
|--------|-----------|
| `sofia_documents` | Chunks de documentos com embeddings VECTOR(1536), índice HNSW |
| `sofia_chat_sessions` | Sessões de chat (UUID, mensagens JSONB — para futura autenticação) |
| `sofia_message_metrics` | Métricas de uso (tokens, latência, custos estimados) |
| `sofia_dashboard` | View agregada para o dashboard de métricas |
| `rate_limit_entries` | Entradas de rate limiting persistido no Supabase (identificador + timestamps[]) |

### RPCs (Funções Remotas) Supabase

- `sofia_match_documents(query_embedding, match_threshold, match_count)` — Busca por similaridade cosseno
- `sofia_log_message_metrics(...)` — Registra métricas de uma mensagem

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

Limites do schema atual:
- Máximo 50 mensagens por request
- Máximo 10.000 caracteres por mensagem
- Máximo 20 partes por mensagem

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

No cliente (`ChatInterface.tsx`), os erros são mapeados para mensagens em português:
- Timeout/abort → sugestão de retry
- 429 → mensagem de rate limit com tempo de espera
- Erros de rede → problema de conexão
- 5xx → erro interno do servidor

### Rate Limiting

Existem duas camadas de rate limiting:

1. **In-memory** (`lib/rate-limit.ts`) — usada em `middleware.ts` e no endpoint:

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

2. **Supabase** (`rate_limit_entries`) — via `checkRateLimit()` em `lib/metrics.ts`, persistido entre instâncias.

### Re-ranking e Otimização de Contexto

Após a busca vetorial, dois passos adicionais refinam os resultados:

**Re-ranking** (`lib/rag-rerank.ts`):
```typescript
import { rerankSources } from '@/lib/rag-rerank'

const reranked = rerankSources(sources, query)
```

**Otimização de contexto** (`lib/context-optimizer.ts`):
```typescript
import { optimizeContext } from '@/lib/context-optimizer'

const { chunks, tokenCount } = optimizeContext(rerankedSources, {
  maxTokens: 2000,
  minChunks: 3,
  maxChunks: 5,
})
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

### Logging

Use `lib/logger.ts` em vez de `console.*` direto:

```typescript
import { logger } from '@/lib/logger'

logger.log('Mensagem de debug')   // silenciado em produção
logger.warn('Aviso')              // silenciado em produção
logger.error('Erro crítico')      // sempre exibido
```

### System Prompt da SOFIA

O system prompt (`lib/system-prompt.ts`) define a personalidade e regras da SOFIA:

- **Nunca usar a palavra "diplomacia"** — usar "Serviço Exterior Brasileiro"
- Tom formal, compatível com o padrão MRE
- Citar dispositivos legais quando aplicável (ex: "art. 57 da Lei nº 11.440/2006")
- Não emitir pareceres jurídicos vinculantes
- Reconhecer limites e encaminhar para Assessoria Jurídica quando necessário
- Hierarquia de fontes: Legislação > Regulamentos MRE > Posições ASOF > Jurisprudência

## Ingestão de Documentos

1. Coloque documentos `.txt` em `/docs/` (organizado em subpastas: `leis/`, `decretos/`, `convencoes/`)
2. Execute `npm run ingest`
3. O script (`scripts/ingest.ts`):
   - Lê todos os `.txt` recursivamente
   - Divide em chunks de 1000 caracteres com 200 de sobreposição
   - Ignora chunks com menos de 50 caracteres
   - Gera embeddings em lotes de 10 via OpenAI `text-embedding-3-small`
   - Faz upsert na tabela `sofia_documents` com metadados (source, title, chunkIndex, totalChunks)

Scripts auxiliares de conversão em `scripts/`:
- `convert_docs.py` — Converte PDF individual para TXT
- `convert_pdfs.py` — Converte PDFs em lote

## Variáveis de Ambiente

```bash
# OpenAI (obrigatório)
OPENAI_API_KEY=sk-...

# Supabase (obrigatório)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Opcional — Portal da Transparência (MCP)
PORTAL_TRANSPARENCIA_API_KEY=...
```

Copie `.env.local.example` para `.env.local` e preencha os valores antes de iniciar.

## Testes

98 testes automatizados com Vitest e jsdom. Sempre mockar o Supabase em testes:

```typescript
vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: vi.fn() },
  supabaseAdmin: { rpc: vi.fn() },
}))
```

Fixtures reutilizáveis em `lib/__tests__/fixtures/sources.ts` fornecem dados determinísticos para os testes de RAG.

Para rodar apenas um grupo de testes:
```bash
vitest run lib/__tests__/rag.test.ts
vitest run lib/__tests__/rag-rerank.test.ts
vitest run lib/__tests__/context-optimizer.test.ts
```

## Brand Kit ASOF

### Paleta de Cores Institucionais

| Token | Hex | Uso |
|-------|-----|-----|
| Preto Profundo | `#000000` | Texto principal, bordas fortes |
| Azul Escuro | `#045495` | Cor primária — botões, links, cabeçalhos |
| Azul Claro | `#76AEEA` | Hover de botões, ícones, destaques secundários |
| Azul Pastel | `#BAD7F7` | Fundos de cards de aviso, badges |
| Lavanda Neutra | `#F3F3FC` | Fundo geral da página, áreas de conteúdo neutras |

### Tipografia Oficial

- **Primária:** Roboto Bold — títulos, logotipo e chamadas principais
- **Secundária:** Segoe UI / Tahoma / Verdana — corpo de texto, descrições, labels

### Padrões de Componentes

```css
/* Botão primário */
background: #045495;
color: white;
border-radius: 0.375rem; /* rounded */
/* Hover: */
background: #76AEEA;

/* Bloco de aviso / comunicado */
background: #BAD7F7;
border-left: 4px solid #045495;

/* Fundo de página */
background: #F3F3FC;
```

Ao criar ou modificar componentes visuais, sempre seguir esses tokens. Evite cores arbitrárias — use apenas as da paleta institucional acima.

## Observações Importantes

- `maxDuration = 30` no endpoint `/api/chat` (limite da Vercel Free tier)
- A função RPC correta é `sofia_match_documents` (não `match_documents` genérico)
- `tiktoken` é declarado como `serverExternalPackages` no `next.config.ts` para compatibilidade com WASM no ambiente Vercel
- O sistema de métricas (`lib/metrics.ts`) é completo mas opcional — o fluxo principal funciona sem ele
- Paralelização é usada em pontos críticos: geração de embedding e conversão de mensagens ocorrem simultaneamente
- O middleware Next.js (`middleware.ts`) aplica rate limiting e injeta headers antes de qualquer handler de rota
- A segunda migração (`20260307000001_rate_limiting.sql`) adiciona a tabela `rate_limit_entries` para persistência de rate limiting entre instâncias da Vercel
