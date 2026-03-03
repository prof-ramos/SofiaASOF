# SOFIA - Sistema de Métricas

Sistema completo de métricas usando **tiktoken** + **Supabase**.

## 📊 Funcionalidades

- **Contagem precisa de tokens** via tiktoken (cl100k_base)
- **Cálculo de custos** por modelo (GPT-4o-mini, GPT-4o, etc.)
- **Latência tracking** (RAG, LLM, total)
- **Rate limiting** (20 req/min por IP)
- **Dashboard API** em `/api/metrics`
- **Persistência** no Supabase PostgreSQL

## 🚀 Setup

### 1. Aplicar Schema ao Supabase

Execute o SQL em `supabase/metrics-schema.sql` no **SQL Editor** do Supabase:

```
https://supabase.com/dashboard/project/hvmcawefxbkwxfkimxlh/sql
```

Ou via CLI:
```bash
supabase db push
```

### 2. Variáveis de Ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=https://hvmcawefxbkwxfkimxlh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
OPENAI_API_KEY=<openai-key>
```

### 3. Instalar Dependências

```bash
npm install tiktoken @supabase/supabase-js
```

## 📈 API Endpoints

### GET /api/metrics

Estatísticas gerais (últimos 7 dias por padrão):

```bash
curl https://sofia-asof.vercel.app/api/metrics
```

Parâmetros:
- `period` - dias (default: 7)
- `view` - `stats` | `dashboard` | `sessions`

### Exemplos

```bash
# Estatísticas dos últimos 30 dias
curl "https://sofia-asof.vercel.app/api/metrics?period=30"

# Dashboard completo
curl "https://sofia-asof.vercel.app/api/metrics?view=dashboard"

# Sessões recentes
curl "https://sofia-asof.vercel.app/api/metrics?view=sessions"
```

## 🔧 Uso no Código

### Contar Tokens

```typescript
import { countTokens, countMessagesTokens } from '@/lib/metrics'

const tokens = countTokens("Texto de exemplo")
const msgTokens = countMessagesTokens([
  { role: 'user', content: 'Pergunta' },
  { role: 'assistant', content: 'Resposta' }
])
```

### Logar Métricas

```typescript
import { logMessageMetrics } from '@/lib/metrics'

await logMessageMetrics({
  sessionId: 'sess_123',
  promptTokens: 150,
  completionTokens: 300,
  latencyMs: 1200,
  ragLatencyMs: 200,
  llmLatencyMs: 1000,
  chunksRetrieved: 5,
  ragSources: ['lei-11440.txt', 'decreto-11357.txt'],
  model: 'gpt-4o-mini'
})
```

### Rate Limiting

```typescript
import { checkRateLimit } from '@/lib/metrics'

const { allowed, remaining } = await checkRateLimit('ip_hash_123')

if (!allowed) {
  return Response.json({ error: 'Rate limit exceeded' }, { status: 429 })
}
```

## 📊 Tabelas

### sofia_chat_sessions

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Primary key |
| session_id | TEXT | ID único da sessão |
| ip_hash | TEXT | Hash do IP (privacidade) |
| message_count | INT | Total de mensagens |
| total_tokens | INT | Total de tokens |
| total_cost | DECIMAL | Custo total (USD) |
| last_activity | TIMESTAMPTZ | Última atividade |

### sofia_message_metrics

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Primary key |
| session_id | TEXT | FK para sessions |
| prompt_tokens | INT | Tokens do prompt |
| completion_tokens | INT | Tokens da resposta |
| latency_ms | INT | Latência total |
| rag_latency_ms | INT | Latência RAG |
| chunks_retrieved | INT | Chunks recuperados |
| total_cost | DECIMAL | Custo da mensagem |
| model | TEXT | Modelo usado |

## 💰 Custos por Modelo

| Modelo | Input (por 1M) | Output (por 1M) |
|--------|---------------|-----------------|
| gpt-4o-mini | $0.15 | $0.60 |
| gpt-4o | $2.50 | $10.00 |
| gpt-4-turbo | $10.00 | $30.00 |
| claude-3-haiku | $0.25 | $1.25 |

## 🔒 Segurança

- **RLS habilitado** em todas as tabelas
- **Service role** tem acesso total
- **Anon** só pode ler (para dashboard público)
- **IP hasheado** para privacidade
- **Rate limiting** previne abuso

## 📝 Próximos Passos

- [ ] Dashboard UI em React
- [ ] Alertas de custo
- [ ] Export CSV/JSON
- [ ] Gráficos de uso
- [ ] Cache Redis para métricas frequentes
