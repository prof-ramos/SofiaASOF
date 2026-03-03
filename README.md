# SOFIA — Agente de IA da ASOF

**S**uporte **O**rientado às **F**unções e **I**nteresses dos **A**ssociados

Chatbot com RAG para orientação de Oficiais de Chancelaria sobre a carreira no Serviço Exterior Brasileiro.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend + API | Next.js 16 (App Router) |
| AI SDK | Vercel AI SDK |
| LLM | OpenAI GPT-4o |
| Banco vetorial | Supabase pgvector |
| Embeddings | OpenAI text-embedding-3-small |
| UI | shadcn/ui + Tailwind CSS |
| Validação | Zod v3.24.1 |

---

## Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com) (plano Free)
- Chave de API da [OpenAI](https://platform.openai.com)
- Chave de API do [Portal da Transparência](https://portaldatransparencia.gov.br/api-de-dados/cadastrar) (opcional)

---

## Configuração

### 1. Variáveis de ambiente

```bash
cp .env.local.example .env.local
# Edite .env.local com suas chaves
```

### 2. Banco de dados (Supabase)

Execute o script SQL no **SQL Editor** do Supabase:

```sql
-- Cole o conteúdo de supabase/schema.sql
```

O schema habilita a extensão `pgvector`, cria a tabela `documents` e a função `match_documents` para busca semântica.

### 3. Instalar dependências

```bash
npm install
```

---

## Ingestão de documentos

Coloque os documentos em texto plano no diretório `/docs/`:

```
docs/
  lei-11440-2006.txt
  decreto-9817-2019.txt
  lei-8112-1990.txt
  ...
```

Execute a ingestão:

```bash
npm run ingest
```

Para processar um arquivo específico:

```bash
npm run ingest -- --file=docs/meu-documento.txt
```

O script divide o texto em chunks, gera embeddings via OpenAI e armazena no Supabase.

---

## Desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

---

## Deploy (Vercel)

1. Conecte o repositório na [Vercel](https://vercel.com)
2. Configure as variáveis de ambiente no painel da Vercel
3. Deploy automático a cada push na branch principal

---

## Estrutura do projeto

```
├── app/
│   ├── api/chat/route.ts     # API route com streaming RAG
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── chat/
│   │   ├── ChatInterface.tsx  # Componente principal do chat
│   │   ├── MessageList.tsx
│   │   ├── MessageItem.tsx
│   │   ├── ChatInput.tsx
│   │   └── WelcomeScreen.tsx
│   └── ui/                    # Componentes shadcn/ui
├── lib/
│   ├── rag.ts                 # Pipeline RAG (embeddings + busca vetorial)
│   ├── supabase.ts            # Clientes Supabase
│   ├── system-prompt.ts       # System prompt da SOFIA
│   └── validation/
│       └── schemas.ts         # Schemas de validação Zod
├── scripts/
│   └── ingest.ts              # Script de ingestão de documentos
├── supabase/
│   └── schema.sql             # Schema do banco de dados
├── types/
│   └── index.ts
└── docs/                      # Documentos para ingestão (não versionados)
```

---

## Fluxo RAG

```
Usuário → API Route → Validação (Zod) → Embedding da pergunta → Busca vetorial (Supabase)
→ Chunks relevantes → System prompt + contexto → OpenAI GPT-4o → Streaming
```

## Segurança

- **Validação de entrada**: Schema Zod valida todos os payloads da API
- **Rate limiting**: Previne abusos com limites de 50 mensagens e 10.000 caracteres
- **Variáveis de ambiente**: Credenciais isoladas no servidor

---

## Restrições

- A SOFIA **não emite pareceres jurídicos vinculantes**
- Respostas têm caráter orientativo e informativo
- Sem armazenamento de dados pessoais no MVP

---

*Desenvolvido sob responsabilidade de Gabriel Ramos — Coordenador Administrativo da ASOF*
