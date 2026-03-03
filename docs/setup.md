# SOFIA - Setup Guide

## Pré-requisitos

- Node.js 18+
- Conta no Vercel
- Conta no Supabase
- Chave de API OpenAI

## 1. Configurar Supabase

### 1.1 Criar projeto

1. Acesse [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Anote a URL e as chaves (anon e service_role)

### 1.2 Executar schema

1. Vá para o SQL Editor no Supabase
2. Cole o conteúdo de `supabase/schema.sql`
3. Execute para criar a tabela e funções

### 1.3 Habilitar pgvector

O comando `CREATE EXTENSION IF NOT EXISTS vector;` já está no schema.
Se necessário, habilite manualmente:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

## 2. Configurar Variáveis de Ambiente

Crie `.env.local` na raiz do projeto:

```env
OPENAI_API_KEY=sk-your-openai-api-key

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 3. Instalar Dependências

```bash
npm install
```

## 4. Preparar Documentos

1. Crie a pasta `documents/`
2. Organize os documentos em subpastas
3. Converta para texto simples (.txt)

## 5. Ingerir Documentos

```bash
npm run ingest "documents/**/*.txt"
```

## 6. Rodar em Desenvolvimento

```bash
npm run dev
```

Acesse http://localhost:3000

## 7. Deploy no Vercel

### 7.1 Conectar repositório

1. Faça push do código para o GitHub
2. No Vercel, importe o repositório
3. Configure as variáveis de ambiente

### 7.2 Variáveis de ambiente no Vercel

Adicione as mesmas variáveis do `.env.local`:

- `OPENAI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 7.3 Deploy

O Vercel fará deploy automático a cada push na main.

## Checklist

- [ ] Projeto Supabase criado
- [ ] Schema SQL executado
- [ ] Variáveis de ambiente configuradas
- [ ] Dependências instaladas
- [ ] Documentos preparados
- [ ] Ingestão realizada
- [ ] Testado localmente
- [ ] Conectado ao Vercel
- [ ] Variáveis configuradas no Vercel
- [ ] Deploy realizado
