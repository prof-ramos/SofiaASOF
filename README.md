# SOFIA - Agente de IA da ASOF

**S**uporte **O**rientado às **F**unções e **I**nteresses dos **A**ssociados

Chatbot com RAG para orientação sobre a carreira de Oficial de Chancelaria do Serviço Exterior Brasileiro.

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend + API | Next.js (Vercel) |
| AI SDK | Vercel AI SDK |
| LLM | OpenAI GPT-4o |
| Banco vetorial | Supabase pgvector |
| Embeddings | OpenAI text-embedding-3-small |

## Desenvolvimento

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env.local

# Rodar em desenvolvimento
npm run dev
```

## Variáveis de Ambiente

```env
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Documentação

- [PRD Completo](./PRD.md)
- [Arquitetura](./docs/architecture.md)
- [Base de Conhecimento](./docs/knowledge-base.md)

## Responsável

Gabriel Ramos - Coordenador Administrativo da ASOF
