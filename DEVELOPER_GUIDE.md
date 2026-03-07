# Guia do Desenvolvedor - SOFIA

Guia completo para contribuir com o desenvolvimento do projeto SOFIA.

---

## 📋 Índice

1. [Configuração do Ambiente](#1-configuração-do-ambiente)
2. [Estrutura do Projeto](#2-estrutura-do-projeto)
3. [Fluxo de Trabalho](#3-fluxo-de-trabalho)
4. [Abordagem de Testes](#4-abordagem-de-testes)
5. [Solução de Problemas](#5-solução-de-problemas)
6. [Boas Práticas](#6-boas-práticas)

---

## 1. Configuração do Ambiente

### 1.1 Pré-requisitos

**Ferramentas obrigatórias:**
- Node.js 18+ ([download](https://nodejs.org))
- Git ([download](https://git-scm.com/downloads))
- Editor de código (VS Code recomendado)

**Contas de serviço:**
- [Supabase](https://supabase.com) - Banco de dados e hospedagem
- [OpenAI](https://platform.openai.com) - API key para embeddings e LLM
- [Vercel](https://vercel.com) - Deploy (opcional)

### 1.2 Setup Inicial

```bash
# 1. Clone o repositório
git clone https://github.com/prof-ramos/SofiaASOF.git
cd SofiaASOF

# 2. Instale dependências
npm install

# 3. Copie arquivo de ambiente
cp .env.local.example .env.local

# 4. Configure variáveis de ambiente
# Edite .env.local com suas chaves API
```

**Variáveis de ambiente necessárias:**

```env
# OpenAI (obrigatório)
OPENAI_API_KEY=sk-...

# Supabase (obrigatório)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Portal da Transparência (opcional)
PORTAL_TRANSPARENCIA_API_KEY=...
```

### 1.3 Setup do Banco de Dados

1. Acesse o projeto no [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá em **SQL Editor**
3. Execute o schema: `supabase/migrations/20260303000000_initial.sql`

Isso cria:
- Tabela `sofia_documents` com embeddings
- RPC `sofia_match_documents` para busca vetorial
- Tabelas de métricas e sessões

### 1.4 Setup do VS Code (Recomendado)

**Extensões necessárias:**
- ESLint
- Prettier
- TypeScript Vue Plugin (Volar)
- Error Lens

**Configuração do workspace:**
```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

### 1.5 Validação do Setup

```bash
# Verificar instalação
npm run dev

# Executar testes
npm test

# Verificar build
npm run build
```

Todos devem passar sem erros.

---

## 2. Estrutura do Projeto

### 2.1 Visão Geral

```
SOFIAASOF/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── chat/route.ts         # RAG + streaming
│   │   └── metrics/              # Métricas
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
│
├── components/                   # Componentes React
│   ├── chat/                    # Interface do chat
│   └── ui/                      # shadcn/ui
│
├── lib/                          # Lógica de negócio
│   ├── __tests__/               # Testes unitários
│   ├── rag.ts                   # Pipeline RAG
│   ├── rag-rerank.ts           # Re-ranking
│   ├── context-optimizer.ts     # Otimização de contexto
│   ├── supabase.ts              # Cliente Supabase
│   ├── validation/              # Schemas Zod
│   └── ...
│
├── scripts/                     # Scripts utilitários
├── docs/                        # Documentos para ingestão
├── types/                       # Tipos globais
└── vitest.config.ts            # Config de testes
```

### 2.2 Arquitetura em Camadas

```
┌─────────────────────────────────────────────────────────────┐
│                     Camada de Apresentação                    │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ UI Components (components/chat/)                       │ │
│  │ - ChatInterface.tsx: Container com useChat()          │ │
│  │ - MessageList.tsx: Renderiza mensagens               │ │
│  │ - ChatInput.tsx: Input com validação                  │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     Camada de API                            │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ app/api/chat/route.ts                                 │ │
│  │ - Rate limiting (20 req/min)                           │ │
│  │ - Validação Zod                                       │ │
│  │ - RAG pipeline + streaming                             │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Camada de Negócio (lib/)                     │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ RAG Pipeline:                                          │ │
│  │ - retrieveContext(): Embeddings + busca vetorial       │ │
│  │ - rerankSources(): Re-ranking heurístico               │ │
│  │ - buildDynamicContextPrompt(): Otimização de tokens   │ │
│  └──────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Validação (lib/validation/):                            │ │
│  │ - ChatRequestSchema: Zod schemas                      │ │
│  │ - safeValidateChatRequest(): Validação segura         │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Camada de Dados                            │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Supabase PostgreSQL + pgvector                          │ │
│  │ - sofia_documents: Chunks com embeddings               │ │
│  │ - sofia_match_documents: RPC para busca semântica      │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Responsabilidades dos Módulos

| Módulo | Responsabilidade | Arquivos Principais |
|--------|-----------------|---------------------|
| **UI Components** | Interface do chat, renderização, interação | `components/chat/` |
| **API Routes** | Endpoints HTTP, validação, streaming | `app/api/chat/route.ts` |
| **RAG Pipeline** | Busca semântica, embeddings, contexto | `lib/rag.ts`, `lib/rag-rerank.ts` |
| **Context Optimizer** | Otimização de tokens, seleção de chunks | `lib/context-optimizer.ts` |
| **Validation** | Schemas Zod, validação de entrada | `lib/validation/schemas.ts` |
| **Supabase Client** | Conexão com banco de dados | `lib/supabase.ts` |
| **Testing** | Testes unitários, integração, fixtures | `lib/__tests__/` |

---

## 3. Fluxo de Trabalho

### 3.1 Desenvolvimento Local

```bash
# Terminal 1: Servidor de desenvolvimento
npm run dev

# Terminal 2: Testes em watch mode (opcional)
npm test --watch

# Terminal 3: Type checker (opcional)
npm run type-check -- --watch
```

### 3.2 Fluxo de Trabalho Recomendado

**Para novas funcionalidades:**

1. **Planejamento**
   - Crie branch: `git checkout -b feature/nova-funcionalidade`
   - Documente o objetivo e mudanças previstas

2. **Implementação**
   - Escreva código seguindo as convenções do projeto
   - Adicione tipos TypeScript para todas as funções
   - Use JSDoc para funções públicas

3. **Testes**
   - Escreva testes antes ou junto com o código (TDD recomendado)
   - Use `lib/__tests__/fixtures/` para mocks
   - Execute `npm test` para verificar

4. **Validação**
   - `npm run lint` - Verificar linting
   - `npm run type-check` - Verificar tipos
   - Testes manuais da funcionalidade

5. **Commit**
   ```bash
   git add .
   git commit -m "feat: descrição da mudança"
   ```

6. **Push e Review**
   ```bash
   git push origin feature/nova-funcionalidade
   # Abra PR no GitHub para review
   ```

### 3.3 Convenções de Código

**TypeScript:**
- PascalCase para componentes: `ChatInterface.tsx`
- camelCase para funções: `retrieveContext()`
- UPPER_CASE para constantes: `RATE_LIMIT_CONFIG`
- Interfaces/Tipo PascalCase: `Source`, `ContextOptimizationOptions`

**Organização de imports:**
```typescript
// 1. Imports do Node.js
import { cache } from 'react'

// 2. Imports de bibliotecas externas
import OpenAI from 'openai'

// 3. Imports internos (aliases)
import { logger } from '@/lib/logger'
import type { Source } from '@/types'
```

**Nomenclatura de arquivos:**
- Componentes React: `PascalCase.tsx`
- Utilitários: `camelCase.ts`
- Tipos: `camelCase.ts` (ou `types.ts` para coleções)
- Testes: `*.test.ts`
- Fixtures: `*.fixtures.ts`

---

## 4. Abordagem de Testes

### 4.1 Suíte de Testes

O projeto usa **Vitest 4.0.18** com **98 testes** organizados em:

- **Testes unitários**: Funções individuais
- **Testes de integração**: Fluxos completos
- **Testes de fixtures**: Verificação de mocks

### 4.2 Estrutura de Testes

```
lib/__tests__/
├── fixtures/              # Mocks e dados de teste
│   ├── sources.ts         # Fontes RAG mockadas
│   └── sources.test.ts    # Verificação de fixtures
├── rag.test.ts           # Testes do pipeline RAG
├── rag-rerank.test.ts    # Testes de re-ranking
├── context-optimizer.test.ts  # Testes de otimização
└── rag-integration.test.ts  # Testes end-to-end
```

### 4.3 Escrevendo Testes

**Padrão de teste:**

```typescript
import { describe, it, expect } from 'vitest'
import { retrieveContext } from '@/lib/rag'

// Mock logger para evitar console noise
vi.mock('@/lib/logger', () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}))

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}))

describe('retrieveContext', () => {
  it('should return empty array on RPC error', async () => {
    // Arrange
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      error: { message: 'Connection failed' },
      data: null
    })

    // Act
    const result = await retrieveContext('test query')

    // Assert
    expect(result).toEqual([])
  })
})
```

### 4.4 Usando Fixtures

```typescript
import {
  mockHighRelevanceSources,
  createLoggerMockPattern
} from '@/lib/__tests__/fixtures/sources'

describe('My Test Suite', () => {
  const loggerMock = createLoggerMockPattern()

  it('should use high relevance fixtures', () => {
    expect(mockHighRelevanceSources.length).toBeGreaterThanOrEqual(5)
    mockHighRelevanceSources.forEach(source => {
      expect(source.similarity).toBeGreaterThanOrEqual(0.8)
    })
  })
})
```

### 4.5 Executando Testes

```bash
# Todos os testes
npm test

# Modo watch
npm run test:watch

# Com UI visual
npm run test:ui

# Coverage
npm run test:coverage

# Apenas arquivos alterados
npm test --changed
```

### 4.6 Boas Práticas de Testes

1. **Testes determinísticos**: Sem `Math.random()`, `Date.now()` sem seed
2. **Mocks limpos**: Use `createLoggerMockPattern()` para estado fresco
3. **Testes independentes**: Cada teste deve funcionar isoladamente
4. **Nomes descritivos**: `should return empty array when RPC fails`
5. **AAA Pattern**: Arrange, Act, Assert claramente separados

---

## 5. Solução de Problemas

### 5.1 Problemas Comuns de Setup

**Problema: `npm install` falha**
```bash
# Solução: Limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm install
```

**Problema: Erro de tipos TypeScript**
```bash
# Solução: Limpar cache do TypeScript
rm -rf .next
npm run dev
```

**Problema: Supabase connection refused**
```bash
# Solução: Verificar variáveis de ambiente
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 5.2 Problemas em Desenvolvimento

**Problema: Pagina não carrega**
```bash
# Verificar se o dev server está rodando
curl http://localhost:3000

# Verificar logs do terminal
# Procure por erros em vermelho
```

**Problema: Embeddings falham**
```bash
# Verificar API key
echo $OPENAI_API_KEY

# Testar conexão
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

**Problema: RAG retorna vazio**
```bash
# Verificar se há documentos na tabela
# No SQL Editor do Supabase:
SELECT COUNT(*) FROM sofia_documents;

# Se 0, execute: npm run ingest
```

### 5.3 Problemas de Testes

**Problema: Testes falham aleatoriamente**
```typescript
// ❌ EVITAR: Testes não-determinísticos
it('should work', () => {
  const random = Math.random()  // ❌
  expect(random).toBeGreaterThan(0.5)
})

// ✅ USAR: Testes determinísticos
it('should work with deterministic value', () => {
  const value = 0.7
  expect(value).toBeGreaterThan(0.5)
})
```

**Problema: Mocks compartilham estado**
```typescript
// ❌ EVITAR: Mock global compartilhado
const loggerMock = { log: vi.fn() }  // ❌ Compartilhado

// ✅ USAR: Factory pattern
function createLoggerMock() {
  return { log: vi.fn() }  // ✅ Fresco a cada teste
}
```

**Problema: Testes lentos**
```typescript
// ❌ EVITAR: Operações lentas desnecessárias
it('should process 1000 sources', async () => {
  const sources = generateMockSources(1000)  // ❌ Lento
})

// ✅ USAR: Mocks para operações lentas
it('should process batch efficiently', async () => {
  const sources = mockBatchResults  // ✅ Instantâneo
})
```

### 5.4 Problemas de Build/Deploy

**Problema: Build falha com erro de tipos**
```bash
# Verificar tipos
npm run type-check

# Limpar cache Next.js
rm -rf .next
npm run build
```

**Problema: Deploy Vercel falha**
```bash
# Verificar variáveis de ambiente na Vercel
# Dashboard → Project → Settings → Environment Variables

# Logs de deploy:
vercel logs [deployment-url]

# Build localmente primeiro
npm run build
```

### 5.5 Debugging

**Ativar logs detalhados:**
```typescript
// Em lib/logger.ts
export const logger = {
  log: (message: string, meta?: object) => {
    console.log(JSON.stringify({ level: 'info', message, meta }))
  }
}
```

**Debugar RAG pipeline:**
```typescript
// Em app/api/chat/route.ts
logger.log(`[RAG DEBUG]: Query: ${queryText}`)
logger.log(`[RAG DEBUG]: Retrieved ${sources.length} chunks`)
logger.log(`[RAG DEBUG]: After re-ranking: ${reranked.length}`)
```

**Trace errors no Supabase:**
```typescript
// Em lib/supabase.ts
const { data, error } = await supabase.rpc('sofia_match_documents', {
  query_embedding: embedding,
  match_threshold: matchThreshold,
  match_count: matchCount,
})

if (error) {
  logger.error('[SUPABASE RPC ERROR]:', {
    message: error.message,
    details: error.hint,
    code: error.code
  })
}
```

---

## 6. Boas Práticas

### 6.1 TypeScript

**Use tipos estritos:**
```typescript
// ❌ EVITAR: any
function process(data: any) { }

// ✅ USAR: Tipos específicos
function process(data: Source[]) { }
```

**Use tipos inferidos quando possível:**
```typescript
// ❌ REDUNDANTE
const sources: Source[] = await retrieveContext(query)

// ✅ INFERIDO
const sources = await retrieveContext(query)
```

### 6.2 Error Handling

**Sempre trate erros explicitamente:**
```typescript
try {
  const result = await riskyOperation()
  return { success: true, data: result }
} catch (error) {
  logger.error('[OPERATION FAILED]:', error)
  return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
}
```

**Use degradação graciosa:**
```typescript
// Sistema deve sempre responder, mesmo com falhas parciais
const ragPromise = retrieveContext(query)
  .catch((error) => {
    logger.error('[RAG FALLBACK]:', error)
    return []  // Continua sem contexto
  })
```

### 6.3 Performance

**Use memoização apropriadamente:**
```typescript
import { cache } from 'react'

// ✅ BOM: Cache operações caras
const createOpenAI = cache(() => {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
})

// ❌ EVITAR: Cache de operações baratas
const add = cache((a: number, b: number) => a + b)  // ❌ Desnecessário
```

**Paralelize operações independentes:**
```typescript
// ✅ BOM: Executar em paralelo
const [embeddings, context] = await Promise.all([
  generateEmbedding(query),
  buildContextPrompt(sources)
])
```

### 6.4 Segurança

**Nunca exponha credenciais:**
```typescript
// ❌ PERIGO: Log de API key
console.log('API Key:', process.env.OPENAI_API_KEY)

// ✅ SEGURO: Log de presença apenas
logger.log('OpenAI configured:', !!process.env.OPENAI_API_KEY)
```

**Valide sempre input do usuário:**
```typescript
// Use Zod para validar
const result = ChatRequestSchema.safeParse(requestBody)
if (!result.success) {
  return new Response(JSON.stringify({
    error: 'Dados inválidos',
    details: result.error.issues
  }), { status: 400 })
}
```

---

## 7. Recursos Adicionais

### 7.1 Links Úteis

- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Supabase pgvector](https://supabase.com/docs/guides/ai/vector-columns)
- [Vitest Documentation](https://vitest.dev/)
- [Zod Documentation](https://zod.dev/)

### 7.2 Scripts NPM Disponíveis

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run start        # Servidor de produção
npm run lint         # ESLint
npm run test         # Executar testes
npm run test:watch   # Testes em modo watch
npm run test:ui      # Testes com interface visual
npm run ingest       # Ingerir documentos na base
```

### 7.3 Comandos Git Úteis

```bash
# Verificar branches
git branch -a

# Verificar mudanças
git status
git diff

# Verificar commits
git log --oneline --graph --all

# Limpar histórico local
git clean -fd
```

---

## 8. Suporte

Para dúvidas ou problemas:

1. Verifique a [seção de solução de problemas](#5-solução-de-problemas)
2. Consulte a [documentação do Next.js](https://nextjs.org/docs)
3. Abra uma [issue no GitHub](https://github.com/prof-ramos/SofiaASOF/issues)

---

**Última atualização:** Março 2026
**Versão do documento:** 1.0
