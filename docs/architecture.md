# Arquitetura - SOFIA

## Visão Geral

A SOFIA é um chatbot com RAG (Retrieval-Augmented Generation) que permite consultar a base de conhecimento legislativa e normativa sobre a carreira de Oficial de Chancelaria.

## Componentes

### Frontend (Next.js)

- **Página principal**: Interface de chat com streaming de respostas
- **Componentes**:
  - `Chat`: Gerencia estado e exibição das mensagens
  - Input de mensagem com botão de envio
  - Exibição de mensagens do usuário e assistente

### API Routes

- **`/api/chat`**: Endpoint principal do chat
  - **Validação**: Schema Zod valida payload (limite de 50 mensagens, 10.000 caracteres)
  - Recebe mensagens do usuário
  - Gera embedding da pergunta
  - Busca documentos relevantes no Supabase
  - Monta prompt com contexto
  - Retorna resposta em streaming

### Validação

- **`lib/validation/schemas.ts`**: Schemas Zod para validação de entrada
  - Valida estrutura, tipos e limites de tamanho
  - Retorna HTTP 400 com erros detalhados se validação falhar

### Supabase

- **Tabela `documents`**: Armazena chunks de documentos com embeddings
- **Função `match_documents`**: Busca vetorial por similaridade
- **Extensão `pgvector`**: Indexação e busca de vetores

### OpenAI

- **`gpt-4o`**: Modelo de chat para geração de respostas
- **`text-embedding-3-small`**: Modelo de embeddings (1536 dimensões)

## Fluxo de Dados

```
[Usuário] → [Frontend] → [API /chat]
                           ↓
                    [Gerar Embedding]
                           ↓
                    [Busca Vetorial] → [Supabase]
                           ↓
                    [Recuperar Contexto]
                           ↓
                    [Montar Prompt] → [System Prompt + Contexto]
                           ↓
                    [Gerar Resposta] → [OpenAI GPT-4o]
                           ↓
                    [Streaming] → [Frontend] → [Usuário]
```

## Ingestão de Documentos

### Processo

1. **Preparação**: Colocar documentos em `documents/` (formato `.txt`)
2. **Chunking**: Dividir em pedaços de ~1000 caracteres
3. **Embedding**: Gerar vetores para cada chunk
4. **Armazenamento**: Inserir no Supabase

### Comando

```bash
npm run ingest "documents/**/*.txt"
```

### Estrutura de pastas sugerida

```
documents/
├── leis/
│   ├── lei-11440-2006.txt
│   ├── lei-8112-1990.txt
│   └── ...
├── decretos/
│   ├── decreto-9817-2019.txt
│   └── ...
├── manuais/
│   ├── redacao-oficial-itamaraty.txt
│   └── ...
└── asof/
    ├── estatuto.txt
    └── ...
```

## Segurança

- **Validação de entrada**: Schema Zod valida todos os payloads da API (limite de 50 mensagens, 10.000 caracteres)
- **Variáveis de ambiente**: Todas as chaves são armazenadas no Vercel/Supabase
- **Service Role Key**: Usada apenas no backend para operações administrativas
- **Anon Key**: Chave pública para operações do frontend
- **Sem dados pessoais**: O MVP não armazena dados pessoais dos usuários

### Camada de Validação

```
[Usuário] → [Frontend] → [API /chat]
                           ↓
                    [Parse JSON]
                           ↓
                    [Validação Zod] → HTTP 400 se inválido
                           ↓
                    [Gerar Embedding]
                           ↓
                    [Busca Vetorial] → [Supabase]
                           ↓
                    [Recuperar Contexto]
                           ↓
                    [Montar Prompt] → [System Prompt + Contexto]
                           ↓
                    [Gerar Resposta] → [OpenAI GPT-4o]
                           ↓
                    [Streaming] → [Frontend] → [Usuário]
```

## Custos (Estimativa)

| Serviço | Plano | Custo |
|---------|-------|-------|
| Vercel | Free | $0/mês |
| Supabase | Free | $0/mês (até 500MB) |
| OpenAI Embeddings | Pay-per-use | ~$0.02/1M tokens |
| OpenAI GPT-4o | Pay-per-use | ~$2.50/1M input tokens |

**Estimativa mensal para uso moderado**: $5-20

## Próximos Passos

1. [ ] Configurar projeto no Supabase
2. [ ] Executar schema SQL
3. [ ] Preparar documentos para ingestão
4. [ ] Configurar variáveis de ambiente no Vercel
5. [ ] Deploy inicial
6. [ ] Testes e validação
