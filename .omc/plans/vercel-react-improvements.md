# Plano de Implementacao - Melhorias Vercel React Best Practices

**Data:** 2025-03-06
**Referencia:** `/docs/VERCEL_REACT_REVIEW.md`
**Projeto:** SOFIA - Chatbot RAG para ASOF
**Revisao:** v2.0 (incorpora feedback do Critic - ITERATE)

---

## Resumo Executivo

Este plano implementa 6 melhorias identificadas na revisao contra as melhores praticas da Vercel. As mudancas estao organizadas em 3 fases por criticidade e dependencia.

| Fase | Itens | Esforco Estimado | Risco |
|------|-------|------------------|-------|
| Fase 1: Correcoes Criticas | 1 item (P0) | 5 min | Baixo |
| Fase 2: Otimizacoes de Performance | 2 itens (P1, P3) | 20 min | Baixo |
| Fase 3: Melhorias de Manutenibilidade | 2 itens (P2, P5) | 40 min | Baixo |
| Fase 4: Arquitetura Futura | 1 item (P4) | 2h+ | Medio |
| **TOTAL** | **6 itens** | **~3h** | **Baixo-Medio** |

---

## Contexto da Arquitetura

```
SOFIA (Next.js 15 + Vercel AI SDK)
├── app/api/chat/route.ts       # Chat com streaming RAG
├── app/api/metrics/route.ts    # Dashboard de metricas
├── lib/rag.ts                  # RAG com Supabase pgvector
├── lib/rate-limit.ts           # Rate limiting in-memory
└── components/chat/MessageList.tsx  # Lista de mensagens
```

**Testes existentes:** `lib/__tests__/rag.test.ts` (cobertura parcial)

---

## Fase 1: Correcoes Criticas (P0)

### 1.1 Corrigir Funcao RPC Obsoleta em RAG Batch

**Prioridade:** P0 - CRITICA (bug funcional)
**Arquivo:** `lib/rag.ts:108`
**Esforco:** 5 minutos

**Problema:**
A funcao `retrieveContextBatch` chama `match_documents` (generico/obsoleto) ao inves de `sofia_match_documents` (especifico do projeto com embeddings configurados).

**Mudanca:**

```diff
// lib/rag.ts:108
- const result = await supabase.rpc('match_documents', {
+ const result = await supabase.rpc('sofia_match_documents', {
    query_embedding: embedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
  })
```

**Criterios de Aceitacao:**
- [ ] Linha 108 de `lib/rag.ts` alterada para usar `sofia_match_documents`
- [ ] Teste manual: busca RAG em modo batch retorna resultados relevantes
- [ ] Nenhum erro de RPC "function does not exist" nos logs
- [ ] Teste unitario adicionado que garante que `match_documents` nao seja usado (nova funcao `retrieveContextBatch` nao chama RPC obsoleto)

**Riscos:**
- **Risco:** A funcao `sofia_match_documents` pode ter assinatura diferente
- **Mitigacao:** A funcao `retrieveContext` (linha 42) ja usa `sofia_match_documents` corretamente - usar mesma assinatura

**Testes:**
```bash
# Teste unitario existente deve continuar passando
npm test lib/__tests__/rag.test.ts

# Teste manual: enviar multiple queries em batch
```

**Teste de Regressao (CORRIGIDO - Adicionar a lib/__tests__/rag.test.ts):**
```typescript
// lib/__tests__/rag.test.ts
import { supabase } from '@/lib/supabase'
import { retrieveContextBatch } from '@/lib/rag'

describe('retrieveContextBatch', () => {
  it('should use sofia_match_documents RPC, not match_documents', async () => {
    // Spy no supabase.rpc para capturar qual funcao esta sendo chamada
    const rpcSpy = vi.spyOn(supabase, 'rpc').mockResolvedValue({
      data: [],
      error: null
    })

    await retrieveContextBatch(['query1'], 0.5, 5)

    // Verificar que sofia_match_documents foi chamado, nao match_documents
    expect(rpcSpy).toHaveBeenCalledWith(
      'sofia_match_documents',  // NAO deve ser 'match_documents'
      expect.objectContaining({
        query_embedding: expect.any(Array),
        match_threshold: 0.5,
        match_count: 5,
      })
    )

    rpcSpy.mockRestore()
  })
})
```

**Nota sobre a correcao do teste:**
- Usa `vi.spyOn(supabase, 'rpc')` ao inves de `vi.fn()` para conectar ao mock real do supabase
- Importa `supabase` de `@/lib/supabase` para ter acesso a instancia correta
- Chama `mockRestore()` para limpar o spy apos o teste

---

## Fase 2: Otimizacoes de Performance (P1, P3)

### 2.1 Inicializacao Antecipada do Cliente OpenAI

**Prioridade:** P1 - ALTA (performance)
**Arquivo:** `app/api/chat/route.ts`
**Esforco:** 5 minutos

**Problema:**
O cliente OpenAI e inicializado APoS a validacao (linha 104), desperdicando 5-10ms de latencia.

**Mudanca:**

```diff
// app/api/chat/route.ts
  // 3. Parse e validar corpo da requisicao
  let requestBody: unknown
  try {
    requestBody = await parsePromise
  } catch (parseError) {
    // ... error handling
  }

  // 3. Validar schema com Zod
  const validationResult = safeValidateChatRequest(requestBody)
  if (!validationResult.success) {
    // ... error handling
  }

  const { messages } = validationResult.data

  // 4. Converter mensagens validadas para UIMessage[]
  const uiMessages = toUIMessages(messages)

- // 5. Inicializar cliente OpenAI
- const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
+ // 5. Inicializar cliente OpenAI (movido antes da validacao para paralelismo)
+ // NOTA: createOpenAI e sync, pode ser chamado antes
```

Nova ordem (apos validacao de API key na linha 59):

```typescript
// 2. Validar API key e criar cliente OpenAI em paralelo ao parsing
if (!process.env.OPENAI_API_KEY) {
  return new Response(/* error */, { status: 500 })
}

// 2.5 Inicializar cliente OpenAI (sincrono, bloqueio zero)
// NOTA: createOpenAI() e da Vercel AI SDK, difere de new OpenAI() do SDK nativo
const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })

// 3. Parse e validar corpo da requisicao
// ... resto do codigo
```

**Criterios de Aceitacao:**
- [ ] Cliente OpenAI criado antes do `parsePromise.await()`
- [ ] Nenhuma regressao no fluxo de validacao (chat funcional)

**Nota sobre medição de performance:**
- A reducao de latencia de ~5-10ms e dificil de medir sem baseline estabelecido
- O objetivo principal e eliminar o desperdicio de inicializacao apos validacao
- Mediacao de baseline e opcional e pode ser feita em fase separada se necessario

**Riscos:**
- **Risco:** Cliente criado mesmo que request seja invalido (desperdicio minimo)
- **Mitigacao:** `createOpenAI` e sincrono e sem efeitos colaterais

**Nota de Consistencia (MELHORIA FUTURA):**
```typescript
// NOTA: Considerar extrair getOpenAI() para lib/openai.ts
// e reutilizar entre lib/rag.ts e app/api/chat/route.ts
// para manter consistencia e aproveitar React.cache()
//
// lib/rag.ts ja usa React.cache() para o cliente OpenAI:
// const openai = React.cache(() => createOpenAI({...}))()
//
// Esta refactorizacao pode ser feita em uma fase posterior.
```

**Testes:**
```bash
# Teste de saude
curl -X POST http://localhost:3000/api/chat -d '{"messages":[]}'

# Medicao de latencia (opcional - baseline requerido)
# Usar Vercel Analytics ou logging custom
```

---

### 2.2 Otimizacao de Scroll com Content-Visibility

**Prioridade:** P3 - MEDIA (performance)
**Arquivo:** `components/chat/MessageList.tsx`
**Esforco:** 15 minutos

**Problema:**
Todas as mensagens sao renderizadas mesmo fora da viewport, impactando conversas longas.

**Mudanca:**

```typescript
// components/chat/MessageList.tsx
// Adicionar styled wrapper para content-visibility

// Novo componente wrapper (apos linha 44):
const MessageItemWrapper = memo(function MessageItemWrapper({
  message,
  isLoading
}: {
  message: UIMessage
  isLoading?: boolean
}) {
  return (
    <div
      className="message-item"
      style={{
        // 'auto' permite pular renderizacao fora da viewport
        // 'visible' durante loading para evitar flicker
        contentVisibility: isLoading ? 'visible' : 'auto'
      }}
    >
      <MessageItem key={message.id} message={message} />
    </div>
  )
})

// Substituir no return:
{messages.map(message => (
- <MessageItem key={message.id} message={message} />
+ <MessageItemWrapper key={message.id} message={message} isLoading={isLoading} />
))}
```

**Comportamento esperado:**
- Quando `isLoading=false`: mensagens fora da viewport usam `content-visibility: auto` (pula renderizacao)
- Quando `isLoading=true`: mensagens visiveis forcam `content-visibility: visible` (evita flicker durante loading)

**Criterios de Aceitacao:**
- [ ] Mensagens fora da viewport usam `content-visibility: auto`
- [ ] Durante loading, `content-visibility: visible` para evitar flicker
- [ ] Teste visual: conversa com 50+ mensagens mantem scroll suave
- [ ] Nenhum flicker ao receber novas mensagens

**Teste objetivo (opcional - Chrome DevTools Performance):**
```bash
# 1. Abrir conversa longa (50+ mensagens)
# 2. Abrir Chrome DevTools > Performance tab
# 3. Iniciar gravacao
# 4. Scroll ate o final da conversa
# 5. Parar gravacao e analisar:
#    - Procurar por "Recalculate Style" e "Layout" events
#    - Verificar que mensagens fora da viewport nao estao sendo renderizadas
#    - Frame rate deve se manter acima de 30fps durante scroll
```

**Riscos:**
- **Risco:** `content-visibility` pode causar flicker em algumas situacoes
- **Mitigacao:** Usar `visible` durante `isLoading`, testar navegacao por scroll

**Testes:**
```bash
# Teste manual: abrir conversa longa e verificar scroll
# Teste visual: enviar 20 mensagens rapidas
```

---

## Fase 3: Melhorias de Manutenibilidade (P2, P5)

### 3.1 Refatorar Switch Case para Objeto de Handlers

**Prioridade:** P2 - MEDIA (manutenibilidade)
**Arquivo:** `app/api/metrics/route.ts`
**Esforco:** 10 minutos

**Problema:**
Switch case dificulta adicionar novos views e testar handlers individualmente.

**Mudanca:**

```typescript
// app/api/metrics/route.ts

// Novo: objeto de handlers (apos imports)
type MetricsView = 'dashboard' | 'sessions' | 'stats'
type HandlerFn = (period: number) => Promise<unknown>

const HANDLERS: Record<MetricsView, HandlerFn> = {
  dashboard: (period) => getDashboard(period),
  sessions: () => getRecentSessions(20),
  stats: (period) => getStats(period),
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const period = parseInt(searchParams.get('period') || '7', 10)
  const view = (searchParams.get('view') || 'stats') as MetricsView

  try {
    const handler = HANDLERS[view] ?? HANDLERS.stats
    const data = await handler(period)

    const response: Record<string, unknown> = {
      success: true,
      data,
    }

    // 'period' so e incluido para view 'stats'
    if (view === 'stats') {
      response.period = `${period} days`
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Metrics API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}
```

**Criterios de Aceitacao:**
- [ ] Switch case substituido por objeto `HANDLERS`
- [ ] Type safety com `MetricsView` type
- [ ] Fallback para `stats` quando view invalido
- [ ] Testes existentes continuam passando
- [ ] Novo view pode ser adicionado apenas adicionando ao objeto `HANDLERS`
- [ ] Estrutura de resposta JSON mantida consistente entre views

**Riscos:**
- **Risco:** Mudanca de comportamento sutil na resposta
- **Mitigacao:** Manter exatamente mesma estrutura de resposta JSON

**Testes:**
```bash
# Testar todos os views
curl "http://localhost:3000/api/metrics?view=stats&period=7"
curl "http://localhost:3000/api/metrics?view=dashboard&period=30"
curl "http://localhost:3000/api/metrics?view=sessions"
curl "http://localhost:3000/api/metrics?view=invalid"  # deve fallback para stats
```

---

### 3.2 Separar Rotas de Metricas

**Prioridade:** P5 - BAIXA (manutenibilidade)
**Arquivos:** Novos `app/api/metrics/stats/route.ts`, `app/api/metrics/dashboard/route.ts`, `app/api/metrics/sessions/route.ts`
**Esforco:** 30 minutos

**Problema:**
Unica rota com switch case dificulta cacheabilidade e separacao de responsabilidades.

**Mudanca:**

Criar tres novas rotas:

```
app/api/metrics/
├── stats/
│   └── route.ts      # GET /api/metrics/stats?period=7
├── dashboard/
│   └── route.ts      # GET /api/metrics/dashboard?period=30
├── sessions/
│   └── route.ts      # GET /api/metrics/sessions
└── route.ts          # Manter para compatibilidade (deprecated)
```

**app/api/metrics/stats/route.ts:**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getStats } from '@/lib/metrics'

export async function GET(request: NextRequest) {
  const period = parseInt(request.nextUrl.searchParams.get('period') || '7', 10)

  try {
    const data = await getStats(period)
    return NextResponse.json({
      success: true,
      period: `${period} days`,
      data,
    })
  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
```

**app/api/metrics/dashboard/route.ts:**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getDashboard } from '@/lib/metrics'

export async function GET(request: NextRequest) {
  const period = parseInt(request.nextUrl.searchParams.get('period') || '30', 10)

  try {
    const data = await getDashboard(period)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard' },
      { status: 500 }
    )
  }
}
```

**app/api/metrics/sessions/route.ts:**
```typescript
import { NextResponse } from 'next/server'
import { getRecentSessions } from '@/lib/metrics'

export async function GET() {
  try {
    const data = await getRecentSessions(20)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Sessions API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}
```

**app/api/metrics/route.ts (compatibilidade):**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

// Redirect para novas rotas (backward compatibility)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const view = searchParams.get('view') || 'stats'

  // Redirect HTTP 307 para a nova rota
  const targetUrl = new URL(`/api/metrics/${view}`, request.url)

  // Usar URLSearchParams local para não mutar o searchParams original
  const localParams = new URLSearchParams(searchParams.toString())
  localParams.delete('view')
  localParams.forEach((value, key) => targetUrl.searchParams.set(key, value))

  return NextResponse.redirect(targetUrl, 307)
}
```

**Criterios de Aceitacao:**
- [ ] Tres novas rotas criadas e funcionando
- [ ] Rota original redireciona para novas rotas (307)
- [ ] Cache do Next.js funciona corretamente para cada rota
- [ ] Frontend em `app/metrics/page.tsx` atualizado para usar novas URLs
- [ ] Teste: nenhuma requisicao para `/api/metrics?view=xxx` nos logs apos atualizacao
- [ ] Tipos de resposta JSON sao consistentes entre todas as rotas

**Riscos:**
- **Risco:** Frontend pode estar usando URLs antigas
- **Mitigacao:** Manter redirect 307 na rota original + atualizar frontend explicitamente

**Atualizacoes no Frontend (OBRIGATORIO):**
```typescript
// app/metrics/page.tsx - localizar e substituir chamadas de API

// ANTES (com parametro view):
- fetch(`/api/metrics?period=${period}&view=stats`)
- fetch(`/api/metrics?period=${period}&view=dashboard`)
- fetch(`/api/metrics?view=sessions`)

// DEPOIS (rotas diretas):
+ fetch(`/api/metrics/stats?period=${period}`)
+ fetch(`/api/metrics/dashboard?period=${period}`)
+ fetch(`/api/metrics/sessions`)
```

**Passo a Passo da Atualizacao do Frontend:**
1. Localizar `app/metrics/page.tsx`
2. Buscar por todas as ocorrencias de `/api/metrics?view=`
3. Substituir cada ocorrencia pela rota correspondente
4. Remover o parametro `view` das query strings
5. Testar manualmente: abrir a pagina de metricas e verificar Network tab

**Verificacao (apos implementacao):**
```bash
# Verificar logs para garantir que nao ha mais chamadas antigas
# Deve mostrar apenas chamadas para /api/metrics/stats, /api/metrics/dashboard, etc.
grep -r "api/metrics?view=" app/
```

**Testes:**
```bash
# Novas rotas
curl "http://localhost:3000/api/metrics/stats?period=7"
curl "http://localhost:3000/api/metrics/dashboard?period=30"
curl "http://localhost:3000/api/metrics/sessions"

# Redirect
curl -I "http://localhost:3000/api/metrics?view=stats&period=7"
# Deve retornar HTTP 307 com Location: /api/metrics/stats?period=7
```

---

## Fase 4: Arquitetura Futura (P4)

### 4.1 Rate Limiting Distribuido (Opcional)

**Prioridade:** P4 - BAIXA (arquitetura futura)
**Arquivo:** `lib/rate-limit.ts`, novo `lib/rate-limit-redis.ts`
**Esforco:** 2+ horas

**Problema:**
Rate limiting in-memory nao funciona em ambientes serverless com multiplas instancias.

**Nota Importante:**
Esta melhoria e OPCIONAL para o MVP. O rate limiting in-memory e adequado para o tier Free da Vercel (baixo trafego). Implementar apenas quando:

1. O app estiver escalando para multiplas instancias
2. Rate limiting estiver sendo contornado por usuarios
3. Houver orcamento para servico Redis (Upstash Redis free: 10K requests/dia)

**Implementacao (quando necessario):**

```typescript
// lib/rate-limit-redis.ts (novo arquivo)
import { Redis } from '@upstash/redis'

interface RateLimitOptions {
  interval: number
  limit: number
}

let redisInstance: Redis | null = null

function getRedis(): Redis {
  if (!redisInstance) {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN

    if (!url || !token) {
      throw new Error('Upstash Redis credentials not configured')
    }

    redisInstance = new Redis({ url, token })
  }

  return redisInstance
}

export async function rateLimitDistributed(
  identifier: string,
  options: RateLimitOptions
) {
  const redis = getRedis()
  const key = `ratelimit:${identifier}`

  const pipeline = redis.pipeline()
  pipeline.incr(key)
  pipeline.expire(key, Math.ceil(options.interval / 1000))

  const [count] = await pipeline.exec()

  const countValue = (count as number) ?? 1

  // NOTA: Verificar compatibilidade de browser ao usar Redis pipeline
  // Upstash Redis REST API é compatível com edge runtimes da Vercel
  // Testar em environment de desenvolvimento antes de produção

  return {
    isRateLimited: countValue > options.limit,
    limit: options.limit,
    remaining: Math.max(0, options.limit - countValue),
    reset: Date.now() + options.interval,
  }
}
```

**Estrategia de Rollout:**

1. **Fase 1:** Adicionar Upstash Redis (tier Free)
2. **Fase 2:** Implementar `rateLimitDistributed`
3. **Fase 3:** Feature flag para alternar entre in-memory e Redis
4. **Fase 4:** Monitorar e migrar gradualmente

**Criterios de Aceitacao (quando implementado):**
- [ ] Upstash Redis configurado com credenciais
- [ ] `rateLimitDistributed` implementado e testado
- [ ] Feature flag configurada para alternar implementations
- [ ] Testes de carga com multiplas instancias
- [ ] Documentacao atualizada
- [ ] Verificacao de compatibilidade de tipos entre in-memory e Redis (ambos devem retornar mesma interface)

**Riscos:**
- **Risco:** Custos adicionais com Redis
- **Mitigacao:** Upstash Redis free tier e generoso para MVP
- **Risco:** Latencia adicional de rede
- **Mitigacao:** Upstash tem edge locations, latencia minima

---

## Estrategia de Testes

### Testes Unitarios

```bash
# Teste existente
npm test lib/__tests__/rag.test.ts

# Novos testes a adicionar
# lib/__tests__/rate-limit.test.ts (quando P4 for implementado)
```

### Testes de Integracao

```bash
# Chat API
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Teste"}]}'

# Metrics API (apos P5)
curl "http://localhost:3000/api/metrics/stats?period=7"
curl "http://localhost:3000/api/metrics/dashboard?period=30"
curl "http://localhost:3000/api/metrics/sessions"
```

### Testes de Performance

```bash
# Medir latencia (opcional - requer baseline)
# Usar hey ou ab (Apache Bench)

hey -n 100 -c 10 -m POST -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Teste"}]}' \
  http://localhost:3000/api/chat
```

### Testes Visuais

- Conversa longa (50+ mensagens) deve ter scroll suave (apos P3)
- Nenhum flicker ao receber novas mensagens (apos P3)

---

## Checklist de Implementacao

### Pre-Implementacao
- [ ] Criar branch `feature/vercel-improvements`
- [ ] Fazer backup dos arquivos a serem modificados
- [ ] Documentar estado atual (logs de performance)
- [ ] **Verificar se `sofia_match_documents` existe no Supabase:**
```bash
# Conectar ao Supabase e executar:
SELECT proname FROM pg_proc WHERE proname = 'sofia_match_documents';
# Esperado: 1 row retornada
```

### Fase 1: Correcoes Criticas
- [ ] P0: Corrigir `lib/rag.ts:108`
- [ ] P0: Adicionar teste unitario com `vi.spyOn` correto
- [ ] Testar busca RAG batch
- [ ] Commit: "fix: corrigir funcao RPC obsoleta em RAG batch"

### Fase 2: Otimizacoes
- [ ] P1: Mover createOpenAI em `app/api/chat/route.ts`
- [ ] P3: Adicionar content-visibility em `components/chat/MessageList.tsx`
- [ ] Testar performance de chat
- [ ] Commit: "perf: otimizar inicializacao OpenAI e scroll de mensagens"

### Fase 3: Manutenibilidade
- [ ] P2: Refatorar switch case em `app/api/metrics/route.ts`
- [ ] P5: Criar novas rotas de metricas
- [ ] Atualizar frontend para usar novas URLs
- [ ] Testar todas as rotas
- [ ] Commit: "refactor: melhorar estrutura de rotas de metricas"

### Fase 4: Arquitetura Futura (Opcional)
- [ ] P4: Implementar rate limiting distribuido (quando necessario)
- [ ] Documentar decisao de postponar

### Pos-Implementacao
- [ ] Rodar todos os testes
- [ ] Teste manual completo
- [ ] Atualizar documentacao
- [ ] Merge para main

---

## Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|---------------|---------|-----------|
| Bug em correcao RPC | Baixa | Alto | Testar com query real |
| Regressao em performance | Baixa | Medio | Teste manual de chat |
| Frontend quebra com novas URLs | Media | Alto | Manter redirects 307 |
| Custos Redis inesperados | Baixa | Medio | Postponar para P4 |

---

## Estimativa de Esforco Detalhada

| Item | Planejamento | Implementacao | Teste | Total |
|------|--------------|---------------|-------|-------|
| P0 - RPC obsoleta | 2 min | 3 min | 5 min | **10 min** |
| P1 - OpenAI antecipado | 2 min | 3 min | 5 min | **10 min** |
| P3 - Content visibility | 5 min | 10 min | 10 min | **25 min** |
| P2 - Switch to object | 3 min | 7 min | 5 min | **15 min** |
| P5 - Separar rotas | 10 min | 15 min | 10 min | **35 min** |
| P4 - Redis (opcional) | 30 min | 60 min | 30 min | **120 min** |

**Total sem P4:** ~1h 35min
**Total com P4:** ~3h 35min

---

## Dependencias

```
Fase 1 (P0)
  └─> independente

Fase 2 (P1, P3)
  └─> independente

Fase 3 (P2, P5)
  P2 ──> independente
  P5 ──> depende de P2 (recomendado fazer P2 primeiro)

Fase 4 (P4)
  └─> independente, pode ser feito a qualquer momento
```

---

## Proximos Passos

1. **Revisar este plano** com a equipe
2. **Aprovar prioridades** (P0-P3 sao criticas, P4-P5 sao opcionais)
3. **Criar branch** e comecar implementacao
4. **Monitorar** metricas antes/depois para validar ganhos

---

## Historico de Revisoes

| Versao | Data | Autor | Mudancas |
|--------|------|-------|----------|
| 1.0 | 2025-03-06 | Planner | Versao inicial |
| 2.0 | 2025-03-06 | Planner | ITERATE - Corrigido teste de regressao P0 (vi.spyOn), removido criterio quantitativo P1, adicionado checkbox verificacao RPC |

---

**Aprovado por:** __________________
**Data:** __________________
