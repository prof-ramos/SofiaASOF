# SOFIA Metrics System

Sistema completo de métricas usando **tiktoken** + **Supabase**.

## 📊 Overview

O sistema de métricas é **auto-gerenciado pelo código**. As migrations de banco de dados são executadas automaticamente pelos scripts de setup, sem necessidade de intervenção manual no SQL Editor.

### Arquitetura de Automação

```
┌── npm run setup (ou npm run migrate)
│   └── scripts/run-migration.ts
│       ├── Conecta ao PostgreSQL (via pg)
│       ├── Verifica migrations já executadas
│       ├── Roda apenas migrations pendentes
│       └── Registra em sofia_migrations
└── Aplicação pronta para uso
```

## 🚀 Setup Rápido

### 1. Variáveis de Ambiente

```env
# Supabase REST API (obrigatório)
NEXT_PUBLIC_SUPABASE_URL=https://hvmcawefxbkwxfkimxlh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Supabase Database (obrigatório para migrations)
SUPABASE_DB_URL=postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres

# OpenAI (obrigatório para RAG)
OPENAI_API_KEY=sk-proj-...
```

### 2. Obter String de Conexão do Banco

1. Acesse: https://supabase.com/dashboard/project/hvmcawefxbkwxfkimxlh/settings/database
2. Copie a **Connection string** (modo Session, porta 5432)
3. Substitua `[YOUR-PASSWORD]` pela senha do banco

### 3. Rodar Migrations

```bash
# Via npm script
npm run migrate

# Ou diretamente
npx tsx scripts/run-migration.ts
```

### 4. Validar Instalação

```bash
npm run validate
# ou
npx tsx scripts/validate-metrics.ts
```

## 📁 Estrutura de Migrations

```
supabase/
├── migrations/
│   ├── 001_create_sessions_table.sql
│   ├── 002_create_metrics_table.sql
│   └── 003_create_functions.sql
├── metrics-schema.sql          # Schema completo (referência)
└── create-metrics-table.sql    # SQL isolado (fallback)
```

### Migrations Automáticas

O script `run-migration.ts` executa automaticamente:

| Migration | Descrição |
|-----------|-----------|
| 001_create_sessions_table | Tabela `sofia_chat_sessions` + índices + RLS |
| 002_create_metrics_table | Tabela `sofia_message_metrics` + índices + RLS |
| 003_create_functions | Functions `sofia_log_message_metrics()`, `sofia_get_stats()` |

### Controle de Execução

```sql
-- Tabela criada automaticamente pelo script
CREATE TABLE sofia_migrations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);
```

O script rastreia quais migrations já foram executadas e roda apenas as pendentes.

## 📊 API Endpoints

### GET /api/metrics

Estatísticas de uso do sistema.

```bash
# Estatísticas dos últimos 7 dias
curl https://sofia-asof.vercel.app/api/metrics

# Período customizado
curl "https://sofia-asof.vercel.app/api/metrics?period=30"

# Dashboard completo
curl "https://sofia-asof.vercel.app/api/metrics?view=dashboard"

# Sessões recentes
curl "https://sofia-asof.vercel.app/api/metrics?view=sessions"
```

### Resposta

```json
{
  "success": true,
  "period": "7 days",
  "data": {
    "total_requests": 1234,
    "unique_sessions": 567,
    "total_tokens": 1234567,
    "total_cost": 1.23,
    "avg_latency_ms": 450
  }
}
```

## 🔧 Uso no Código

### Contar Tokens

```typescript
import { countTokens, countMessagesTokens } from '@/lib/metrics'

// Texto simples
const tokens = countTokens("Pergunta do usuário")

// Array de mensagens
const msgTokens = countMessagesTokens([
  { role: 'user', content: 'Pergunta' },
  { role: 'assistant', content: 'Resposta' }
])
```

### Logar Métricas

```typescript
import { logMessageMetrics } from '@/lib/metrics'

await logMessageMetrics({
  sessionId: 'sess_abc123',
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

const { allowed, remaining, resetAt } = await checkRateLimit('ip_hash')

if (!allowed) {
  return Response.json(
    { error: 'Rate limit exceeded', resetAt },
    { status: 429 }
  )
}
```

## 📋 Tabelas do Sistema

### sofia_chat_sessions

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Primary key |
| session_id | TEXT | ID único da sessão |
| ip_hash | TEXT | Hash SHA-256 do IP |
| message_count | INT | Total de mensagens |
| total_tokens | INT | Total de tokens |
| total_cost | DECIMAL(10,6) | Custo total (USD) |
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
| total_cost | DECIMAL(10,6) | Custo da mensagem |
| model | TEXT | Modelo usado |

### sofia_migrations

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | SERIAL | Primary key |
| name | TEXT | Nome da migration |
| executed_at | TIMESTAMPTZ | Data de execução |

## 💰 Custos por Modelo

| Modelo | Input (por 1M) | Output (por 1M) |
|--------|---------------|-----------------|
| gpt-4o-mini | $0.15 | $0.60 |
| gpt-4o | $2.50 | $10.00 |
| gpt-4-turbo | $10.00 | $30.00 |
| claude-3-haiku | $0.25 | $1.25 |
| claude-3-sonnet | $3.00 | $15.00 |

### Estimativa Mensal

- **1000 queries/dia** × **500 tokens/query** = 500K tokens/dia
- **Input:** 400K × $0.15/1M = $0.06/dia
- **Output:** 100K × $0.60/1M = $0.06/dia
- **Total:** ~$0.12/dia = **~$3.60/mês**

## 🔒 Segurança

- **RLS habilitado** em todas as tabelas
- **Service role** tem acesso total (para backend)
- **IP hasheado** (SHA-256 + salt) para privacidade
- **Rate limiting** previne abuso (20 req/min/IP)
- **Migrations versionadas** evitam re-execução

## 🛠️ Scripts Disponíveis

```bash
# Rodar migrations
npm run migrate

# Validar sistema
npm run validate

# Testar conexão
npm run test:metrics

# Setup completo
npm run setup:metrics
```

## 📝 Troubleshooting

### Migration falha com "password authentication failed"

1. Verifique se `SUPABASE_DB_URL` está correto
2. Confirme que a senha do banco está correta
3. Use a connection string do modo **Session** (porta 5432), não Transaction

### Tabelas não aparecem

```bash
# Verificar se migrations foram executadas
npx tsx -e "
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data } = await supabase.from('sofia_migrations').select('*')
console.log(data)
"
```

### RPC function não encontrada

```bash
# Re-rodar migration de functions
npx tsx scripts/run-migration.ts
```

## 🔮 Próximos Passos

- [ ] Dashboard UI com gráficos (Chart.js/Recharts)
- [ ] Alertas de custo via Discord/Slack
- [ ] Export dados (CSV/JSON)
- [ ] Cache Redis para métricas frequentes
- [ ] Monitoramento uptime (UptimeRobot)
- [ ] Backup automático de métricas

---

**Última atualização:** 2026-03-03
**Repositório:** https://github.com/prof-ramos/SofiaASOF
**Produção:** https://sofia-asof.vercel.app
