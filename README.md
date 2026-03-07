# SOFIA — Agente de IA da ASOF

**S**uporte **O**rientado às **F**unções e **I**nteresses dos **A**ssociados

Chatbot com RAG (Retrieval Augmented Generation) para orientação de Oficiais de Chancelaria sobre a carreira, direitos, deveres e procedimentos funcionais no Serviço Exterior Brasileiro.

[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Vercel](https://img.shields.io/badge/Vercel-deployed-brightgreen?logo=vercel)](https://vercel.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🎯 Visão Geral

SOFIA é um assistente de IA especializado que combina:
- **Busca semântica** em documentos legais usando embeddings e pgvector
- **Re-ranking inteligente** para melhor precisão das respostas
- **Otimização dinâmica de contexto** para reduzir custos mantendo qualidade
- **Streaming de respostas** em tempo real
- **Validação robusta** de entrada com Zod
- **Rate limiting** para prevenir abusos

**Deploy em produção:** https://sofia-asof.vercel.app

---

## 🛠 Stack Tecnológico

| Camada | Tecnologia | Versão |
|---|---|---|
| **Frontend + API** | Next.js (App Router) | 16.1.6 |
| **AI SDK** | Vercel AI SDK | Latest |
| **LLM** | OpenAI GPT-4o | - |
| **Banco vetorial** | Supabase (PostgreSQL + pgvector) | - |
| **Embeddings** | OpenAI text-embedding-3-small | 1536 dim |
| **UI Components** | shadcn/ui + Tailwind CSS | - |
| **Validação** | Zod | 3.24.1 |
| **Testes** | Vitest | 4.0.18 |
| **Type Safety** | TypeScript | 5.8 |

---

## 📋 Pré-requisitos

- **Node.js** 18+ ([download](https://nodejs.org))
- **Conta Supabase** ([plano Free](https://supabase.com))
- **OpenAI API Key** ([platform](https://platform.openai.com))
- **Portal da Transparência API Key** (opcional - [cadastrar](https://portaldatransparencia.gov.br/api-de-dados/cadastrar))

---

## 🚀 Configuração Rápida

### 1. Clone o repositório

```bash
git clone https://github.com/prof-ramos/SofiaASOF.git
cd SofiaASOF
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

```bash
cp .env.local.example .env.local
```

Edite `.env.local` com suas chaves:

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

### 4. Configure o banco de dados

No **SQL Editor** do Supabase, execute:

```sql
-- Cole o conteúdo de supabase/migrations/20260303000000_initial.sql
```

Isso habilita:
- Extensão `pgvector` para busca vetorial
- Tabela `sofia_documents` com embeddings
- RPC `sofia_match_documents` para busca semântica
- Tabelas de métricas e sessões

### 5. Injete documentos na base de conhecimento

Coloque documentos `.txt` em `/docs/`:

```bash
docs/
├── leis/
│   ├── lei-11440-2006.txt
│   └── lei-8112-1990.txt
├── decretos/
│   └── decreto-9817-2019.txt
└── resolucoes/
    └── resolucao-cn-2019.txt
```

Execute a ingestão:

```bash
# Processar todos os documentos
npm run ingest

# Processar arquivo específico
npm run ingest -- --file=docs/lei-11440-2006.txt
```

### 6. Inicie o servidor de desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

---

## 🧪 Testes

O projeto possui **98 testes automatizados** cobrindo:

- **RAG Pipeline** - Recuperação, re-ranking, otimização de contexto
- **Validação** - Schemas Zod para requests
- **Integração** - Fluxo completo RAG + streaming
- **Fixtures** - Mocks determinísticos para testes

```bash
# Executar todos os testes
npm test

# Executar com interface visual
npm run test:ui

# Executar com coverage
npm run test:coverage
```

**覆盖率 atual:** 98 testes passando (0 falhas)

---

## 📁 Estrutura do Projeto

```
├── app/                          # Next.js App Router
│   ├── api/
│   │   ├── chat/route.ts         # API route principal (RAG + streaming)
│   │   └── metrics/              # Endpoints de métricas
│   ├── layout.tsx                # Layout raiz
│   ├── page.tsx                 # Home page (lazy load ChatInterface)
│   └── metrics/page.tsx         # Dashboard de métricas
│
├── components/                   # Componentes React
│   ├── chat/                    # Interface do chat
│   │   ├── ChatInterface.tsx    # Container principal (useChat)
│   │   ├── MessageList.tsx      # Lista de mensagens
│   │   ├── MessageItem.tsx      # Item individual de mensagem
│   │   ├── ChatInput.tsx        # Input com textarea
│   │   └── WelcomeScreen.tsx    # Tela de boas-vindas
│   └── ui/                      # Componentes shadcn/ui
│
├── lib/                          # Lógica de negócio
│   ├── rag.ts                   # Pipeline RAG principal
│   ├── rag-rerank.ts            # Re-ranking de chunks (heurística)
│   ├── context-optimizer.ts     # Otimização dinâmica de contexto
│   ├── supabase.ts              # Clientes Supabase (público + admin)
│   ├── rate-limit.ts            # Rate limiting in-memory
│   ├── logger.ts                # Logger com環境 awareness
│   ├── metrics.ts               # Sistema de métricas
│   ├── system-prompt.ts         # Personalidade da SOFIA
│   └── validation/
│       ├── schemas.ts           # Schemas Zod para validação
│       └── __tests__/           # Testes de validação
│
├── lib/__tests__/               # Testes unitários
│   ├── rag.test.ts              # Testes do pipeline RAG
│   ├── rag-rerank.test.ts       # Testes de re-ranking
│   ├── rag-integration.test.ts  # Testes end-to-end RAG
│   ├── context-optimizer.test.ts # Testes de otimização
│   └── fixtures/                # Mocks e fixtures para testes
│       ├── sources.ts           # Fontes RAG mockadas
│       └── sources.test.ts      # Verificação de fixtures
│
├── scripts/                     # Scripts utilitários
│   ├── ingest.ts                # Ingestão de documentos
│   └── apply-rate-limiting-migration.ts  # Migração de métricas
│
├── supabase/
│   └── migrations/
│       └── 20260303000000_initial.sql  # Schema inicial do banco
│
├── docs/                         # Documentos para ingestão (.txt)
├── types/                        # Tipos TypeScript globais
├── vitest.config.ts             # Configuração do Vitest
├── next.config.ts               # Configuração do Next.js
└── tsconfig.json                # Configuração do TypeScript
```

---

## 🔄 Fluxo RAG Completo

```
1. USUÁRIO digita pergunta
        ↓
2. API /api/chat (route.ts)
        ↓
3. Rate limiting (20 req/min por IP)
        ↓
4. Validação Zod do payload
        ↓
5. Gera embedding da pergunta (OpenAI text-embedding-3-small)
        ↓
6. Busca vetorial no Supabase (RPC: sofia_match_documents)
   - Threshold: 0.7 (apenas chunks relevantes)
   - Top 8 chunks recuperados
        ↓
7. Re-ranking heurístico dos chunks
   - Penaliza chunks muito curtos/longos
   - Bonifica palavras-chave no início
   - Normaliza scores para [0, 1]
        ↓
8. Otimização dinâmica do contexto
   - Estima tokens (~4 chars = 1 token)
   - Limita a 2000 tokens
   - Mantém diversidade (max 2 chunks/doc)
   - Mínimo 3 chunks garantidos
        ↓
9. Monta prompt com contexto + system prompt SOFIA
        ↓
10. OpenAI GPT-4o via Vercel AI SDK
        ↓
11. Streaming da resposta ao usuário
```

---

## 🔒 Segurança

### Validação de Entrada
- **Schema Zod** valida todos os payloads da API
- Máximo 50 mensagens por requisição
- Máximo 10.000 caracteres por mensagem
- Máximo 20 partes por mensagem

### Rate Limiting
- **20 requisições por minuto** por IP
- Cabeçalhos de resposta HTTP:
  - `Retry-After`: tempo de espera
  - `X-RateLimit-Limit`: limite total
  - `X-RateLimit-Remaining`: requisições restantes
  - `X-RateLimit-Reset`: timestamp do reset

### Proteção de Dados
- Variáveis de ambiente isoladas no servidor
- **Nenhum dado pessoal** armazenado no MVP
- Logs de erro estruturados (sem informações sensíveis)

### Degradação Graciosa
- RAG falha → continua sem contexto
- Embedding falha → retorna array vazio
- Supabase RPC falha → retorna array vazio
- Sistema **sempre responde**, nunca quebra

---

## 📊 Métricas e Monitoramento

O projeto possui um sistema completo de métricas:

### Endpoints Disponíveis

- `/api/metrics/stats` - Estatísticas agregadas
- `/api/metrics/dashboard` - Dados do dashboard
- `/api/metrics/sessions` - Sessões de chat
- `/metrics` - Dashboard visual

### Métricas Coletadas

- **Tokens consumidos** por requisição
- **Custo estimado** em USD
- **Latência** do pipeline RAG
- **Tamanho do contexto** otimizado
- **Taxa de sucesso** das requisições

---

## 🚀 Deploy em Produção

### Vercel (Recomendado)

O deploy está configurado para Vercel:

1. **Conecte o repositório** na [Vercel](https://vercel.com)
2. **Configure variáveis de ambiente** no painel
3. **Deploy automático** a cada push em `main`

**URLs:**
- Produção: https://sofia-asof.vercel.app
- Inspect: https://vercel.com/gabriel-ramos-projects-c715690c/sofia-asof

### Variáveis de Ambiente Necessárias

```env
OPENAI_API_KEY=sk-...                       # Obrigatório
NEXT_PUBLIC_SUPABASE_URL=https://...       # Obrigatório
NEXT_PUBLIC_SUPABASE_ANON_KEY=...          # Obrigatório
SUPABASE_SERVICE_ROLE_KEY=...               # Obrigatório
PORTAL_TRANSPARENCIA_API_KEY=...           # Opcional
```

---

## 🎨 Personalização

### System Prompt

Edite `lib/system-prompt.ts` para ajustar a personalidade da SOFIA:

```typescript
export const SOFIA_SYSTEM_PROMPT = `
Você é SOFIA, um assistente de IA da ASOF...
`
```

### Parâmetros RAG

Edite `app/api/chat/route.ts`:

```typescript
retrieveContext(queryText, 0.7, 8)  // threshold, matchCount
buildDynamicContextPrompt(sources, {
  maxContextTokens: 2000,
  minChunks: 3,
  maxChunks: 5,
  diversityThreshold: 2
})
```

---

## 📚 Documentação Relacionada

- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Supabase pgvector](https://supabase.com/docs/guides/ai/vector-columns)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
- [Zod Validation](https://zod.dev)

---

## ⚠️ Limitações e Restrições

- **Não emite pareceres jurídicos vinculantes** - respostas têm caráter orientativo
- **Base de conhecimento limitada** aos documentos injetados
- **Máximo 50 mensagens** por sessão no histórico
- **Rate limiting** de 20 requisições/minuto por IP
- **Sem autenticação** no MVP (planejado para versão futura)

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o repositório
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

**Desenvolvido sob responsabilidade de [Gabriel Ramos](https://github.com/prof-ramos)** — Coordenador Administrativo da ASOF

---

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.
