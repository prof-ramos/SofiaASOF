# SOFIA API Documentation

**Versão:** 1.1.0
**Base URL:** `https://sofia-asof.vercel.app`
**Status:** Produção

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Autenticação](#autenticação)
3. [Endpoints Públicos](#endpoints-públicos)
4. [Rate Limiting](#rate-limiting)
5. [Formato de Respostas](#formato-de-respostas)
6. [Códigos de Status](#códigos-de-status)
7. [Exemplos de Uso](#exemplos-de-uso)
8. [Limitações e Restrições](#limitações-e-restrições)

---

## Visão Geral

A API SOFIA (Suporte Orientado às Funções e Interesses dos Associados) é uma interface RESTful que permite interação com o assistente de IA da ASOF. A API utiliza:

- **Protocolo:** HTTPS
- **Formato de dados:** JSON
- **Encoding:** UTF-8
- **IA Backend:** OpenAI GPT-4o via Vercel AI SDK
- **Busca Semântica:** Supabase pgvector com embeddings OpenAI

---

## Autenticação

**Status atual:** Sem autenticação (versão MVP)

A API atualmente não requer autenticação para uso público. Em versões futuras será implementado:

- JWT tokens para associados ASOF
- Rate limiting por usuário autenticado
- Histórico de conversas persistente

---

## Endpoints Públicos

### 1. Chat com SOFIA

Envie mensagens para o assistente SOFIA e receba respostas em streaming.

**Endpoint:** `POST /api/chat`

**Propósito:** Interface principal de chat com RAG (Retrieval Augmented Generation)

**Request Headers:**
```http
Content-Type: application/json
```

**Request Body:**
```typescript
{
  "messages": Array<{
    role: "user" | "assistant" | "system"
    content: string
  }>
  // Máximo 50 mensagens
  // Máximo 10.000 caracteres por mensagem
}
```

**Exemplo de Request:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Quais são os direitos dos Oficiais de Chancelaria em exercício no exterior?"
    }
  ]
}
```

**Response:**
- **Tipo:** Server-Sent Events (SSE) Streaming
- **Formato:** Chunks de texto em tempo real
- **Encoding:** UTF-8

**Exemplo de Response (Streaming):**
```
data: {"type":"text","text":"Conforme"}

data: {"type":"text","text":" a Lei"}

data: {"type":"text","text":" nº 11.440/2006"}

...
```

**Códigos de Status:**
- `200 OK` - Streaming iniciado com sucesso
- `400 Bad Request` - JSON inválido ou dados incorretos
- `429 Too Many Requests` - Rate limit excedido
- `500 Internal Server Error` - Erro no servidor

**Rate Limiting:**
- **Limite:** 20 requests por minuto por IP
- **Janela:** 60 segundos
- **Headers de Resposta:**
  - `X-RateLimit-Limit`: 20
  - `X-RateLimit-Remaining`: 15
  - `X-RateLimit-Reset`: 1678900000
  - `Retry-After`: 45

**Timeout:**
- **Duração máxima:** 30 segundos
- Após 30s, a conexão é encerrada pelo servidor

**Exemplo Completo (cURL):**
```bash
curl -X POST https://sofia-asof.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "O que é progressão funcional?"
      }
    ]
  }'
```

**Exemplo Completo (JavaScript/TypeScript):**
```typescript
const response = await fetch('https://sofia-asof.vercel.app/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    messages: [
      {
        role: 'user',
        content: 'O que é progressão funcional?'
      }
    ]
  })
})

// Ler streaming response
const reader = response.body?.getReader()
const decoder = new TextDecoder()

while (true) {
  const { done, value } = await reader!.read()
  if (done) break

  const chunk = decoder.decode(value)
  console.log('Chunk:', chunk)
}
```

---

### 2. Estatísticas Agregadas

Obtém estatísticas agregadas de uso do sistema.

**Endpoint:** `GET /api/metrics/stats`

**Propósito:** Métricas consolidadas de tokens, custos e latência

**Request Headers:**
```http
Content-Type: application/json
```

**Response:**
```typescript
{
  "totalRequests": number
  "totalTokens": number
  "totalCost": number
  "averageLatency": number
  "successRate": number
}
```

**Exemplo de Response:**
```json
{
  "totalRequests": 150,
  "totalTokens": 450000,
  "totalCost": 1.35,
  "averageLatency": 2.3,
  "successRate": 0.98
}
```

**Exemplo (cURL):**
```bash
curl -X GET https://sofia-asof.vercel.app/api/metrics/stats
```

---

### 3. Dashboard de Métricas

Obtém dados detalhados para dashboard administrativo.

**Endpoint:** `GET /api/metrics/dashboard`

**Propósito:** Dados granulares para visualização em dashboard

**Request Parameters (Query String):**
```typescript
{
  period?: "hour" | "day" | "week" | "month"
  limit?: number // padrão: 100
}
```

**Response:**
```typescript
{
  metrics: Array<{
    timestamp: string
    tokens: number
    cost: number
    latency: number
    contextSize: number
  }>
}
```

**Exemplo de Response:**
```json
{
  "metrics": [
    {
      "timestamp": "2026-03-07T05:00:00Z",
      "tokens": 1500,
      "cost": 0.0045,
      "latency": 2.1,
      "contextSize": 850
    }
  ]
}
```

**Exemplo (cURL):**
```bash
curl -X GET "https://sofia-asof.vercel.app/api/metrics/dashboard?period=day&limit=50"
```

---

### 4. Sessões de Chat

Lista sessões de chat registradas (para futura autenticação).

**Endpoint:** `GET /api/metrics/sessions`

**Propósito:** Recuperar histórico de sessões

**Request Parameters (Query String):**
```typescript
{
  limit?: number // padrão: 20
  offset?: number // padrão: 0
}
```

**Response:**
```typescript
{
  sessions: Array<{
    sessionId: string
    startTime: string
    messageCount: number
    totalTokens: number
    totalCost: number
  }>
}
```

**Exemplo de Response:**
```json
{
  "sessions": [
    {
      "sessionId": "uuid-123",
      "startTime": "2026-03-07T04:30:00Z",
      "messageCount": 5,
      "totalTokens": 3500,
      "totalCost": 0.0105
    }
  ]
}
```

**Exemplo (cURL):**
```bash
curl -X GET "https://sofia-asof.vercel.app/api/metrics/sessions?limit=10"
```

---

## Rate Limiting

A API implementa rate limiting para prevenir abuso e garantir disponibilidade.

### Configuração Atual

```typescript
{
  interval: 60_000,  // 60 segundos
  limit: 20          // 20 requests por janela
}
```

### Headers de Resposta

```http
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 15
X-RateLimit-Reset: 1678900000
Retry-After: 45
```

### Comportamento

- **Dentro do limite:** Request processado normalmente
- **Acima do limite:** Retorna `429 Too Many Requests` com cabeçalho `Retry-After`

### Exemplo de Resposta de Rate Limit

```json
{
  "error": "Limite de requisições excedido",
  "details": "Aguarde 45s antes de tentar novamente.",
  "retryAfter": 45
}
```

---

## Formato de Respostas

### Sucesso (2xx)

**Streaming Response (SSE):**
```
data: {"type":"text","text":"Hello"}
data: {"type":"text","text":" World"}
```

**JSON Response:**
```json
{
  "data": { ... }
}
```

### Erro (4xx, 5xx)

**Formato Padrão:**
```json
{
  "error": string,
  "details": string | object
}
```

**Exemplos:**

**JSON Inválido:**
```json
{
  "error": "JSON inválido",
  "details": "O corpo da requisição deve ser um JSON válido"
}
```

**Dados Inválidos:**
```json
{
  "error": "Dados inválidos",
  "details": [
    {
      "path": "messages.0.role",
      "message": "Valor inválido. Esperado: user | assistant | system"
    }
  ]
}
```

**Rate Limit:**
```json
{
  "error": "Limite de requisições excedido",
  "details": "Aguarde 30s antes de tentar novamente.",
  "retryAfter": 30
}
```

---

## Códigos de Status

| Código | Significado | Descrição |
|--------|-------------|-----------|
| `200 OK` | Sucesso | Request processado com sucesso |
| `400 Bad Request` | Erro do cliente | JSON inválido ou dados incorretos |
| `429 Too Many Requests` | Rate limit | Limite de requisições excedido |
| `500 Internal Server Error` | Erro do servidor | Erro interno inesperado |
| `503 Service Unavailable` | Serviço indisponível | Servidor em manutenção |

---

## Exemplos de Uso

### Exemplo 1: Chat Simples

```typescript
const response = await fetch('https://sofia-asof.vercel.app/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [
      { role: 'user', content: 'O que é a ASOF?' }
    ]
  })
})

const reader = response.body?.getReader()
const decoder = new TextDecoder()

while (true) {
  const { done, value } = await reader!.read()
  if (done) break
  console.log(decoder.decode(value))
}
```

### Exemplo 2: Chat com Histórico

```typescript
const response = await fetch('https://sofia-asof.vercel.app/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [
      {
        role: 'user',
        content: 'O que é progressão funcional?'
      },
      {
        role: 'assistant',
        content: 'A progressão funcional é o avanço na carreira...'
      },
      {
        role: 'user',
        content: 'Quais os requisitos?'
      }
    ]
  })
})
```

### Exemplo 3: Tratamento de Erros

```typescript
try {
  const response = await fetch('https://sofia-asof.vercel.app/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [...] })
  })

  // Verificar rate limit
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After')
    console.log(`Aguarde ${retryAfter}s antes de tentar novamente`)
    return
  }

  // Verificar outros erros
  if (!response.ok) {
    const error = await response.json()
    console.error('Erro:', error.error, error.details)
    return
  }

  // Processar streaming response
  const reader = response.body?.getReader()
  // ... ler streaming

} catch (error) {
  console.error('Erro de rede:', error)
}
```

### Exemplo 4: Buscar Métricas

```typescript
// Estatísticas agregadas
const stats = await fetch('https://sofia-asof.vercel.app/api/metrics/stats')
  .then(r => r.json())

console.log('Total de requests:', stats.totalRequests)
console.log('Custo total:', stats.totalCost)

// Dashboard de métricas (últimas 24h)
const dashboard = await fetch(
  'https://sofia-asof.vercel.app/api/metrics/dashboard?period=day&limit=100'
).then(r => r.json())

console.log('Métricas:', dashboard.metrics)
```

---

## Limitações e Restrições

### Limites de Payload

| Parâmetro | Limite | Descrição |
|-----------|--------|-----------|
| `messages` | 50 itens | Máximo de mensagens por request |
| `content` | 10.000 caracteres | Máximo por mensagem |
| `parts` | 20 itens | Máximo de partes por mensagem (futuro) |

### Limites de Tempo

| Operação | Limite | Descrição |
|----------|--------|-----------|
| Streaming | 30s | Duração máxima da conexão |
| Timeout do servidor | 30s | `maxDuration` configurado |

### Limites de Custo

**Estimativa atual:**
- **GPT-4o:** ~$0.003 por 1.000 tokens
- **Embeddings:** ~$0.00002 por 1.000 tokens
- **Custo médio por pergunta:** ~$0.01 - $0.05

### Restrições de Uso

1. **Não comercializar** a API sem autorização expressa da ASOF
2. **Não emitir pareceres jurídicos vinculantes** - respostas têm caráter orientativo
3. **Respeitar rate limits** - implementar exponential backoff em caso de 429
4. **Não fazer spam** - requisições em massa podem resultar em bloqueio

### Práticas Recomendadas

1. **Implementar retry com exponential backoff:**
```typescript
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options)

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '5')
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
        continue
      }

      return response
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000))
    }
  }
}
```

2. **Validar response antes de processar:**
```typescript
if (!response.ok) {
  const error = await response.json()
  throw new Error(`${error.error}: ${error.details}`)
}
```

3. **Implementar timeout no cliente:**
```typescript
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 35000) // 35s

try {
  const response = await fetch(url, {
    ...options,
    signal: controller.signal
  })
  clearTimeout(timeoutId)
  return response
} catch (error) {
  if (error.name === 'AbortError') {
    throw new Error('Request timeout')
  }
  throw error
}
```

---

## Suporte e Contato

- **Documentação do Projeto:** https://github.com/prof-ramos/SofiaASOF
- **Issues:** https://github.com/prof-ramos/SofiaASOF/issues
- **Responsável:** Gabriel Ramos (Coordenador Administrativo ASOF)

---

## Changelog de Versões

### v1.1.0 (2026-03-07)
- ✅ Documentação completa da API
- ✅ Tratamento de erros específico no frontend
- ✅ Sistema de métricas e dashboard
- ✅ 98 testes automatizados

### v1.0.0 (2026-03-03)
- 🚀 Release inicial MVP
- 🤖 Chat com RAG (Retrieval Augmented Generation)
- 📊 Sistema de métricas básico
- 🔒 Rate limiting implementado

---

**Última atualização:** 2026-03-07
**Status:** ✅ Produção Ativa
