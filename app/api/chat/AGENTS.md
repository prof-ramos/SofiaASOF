<!-- Parent: ../../AGENTS.md -->
<!-- Generated: 2026-03-05 | Updated: 2026-03-05 -->

# chat

## Purpose
Chat API endpoint implementing RAG (Retrieval Augmented Generation) pipeline. Processes user messages, retrieves relevant context from Supabase, and streams GPT-4o responses.

## Key Files

| File | Description |
|------|-------------|
| `route.ts` | API Route for chat requests with RAG and streaming |

## For AI Agents

### Working In This Directory
- **Server Component**: This is an API Route (runs on server)
- **Streaming**: Uses Vercel AI SDK's `streamText()` for responses
- **RAG Pipeline**: Retrieves context before generating responses
- **Error Handling**: Graceful degradation if RAG fails

### Common Patterns
- Always validate input with Zod schemas
- Use `Promise.all()` for parallel async operations
- Return `result.toUIMessageStreamResponse()` for streaming
- Log errors with context prefixes ([RAG ERROR], etc.)

## Request Flow

1. **Validate API Key**: Check OPENAI_API_KEY is configured
2. **Parse Request**: Extract JSON body with early parsing
3. **Validate Schema**: Use Zod to validate message format
4. **Extract User Message**: Get last user message for RAG
5. **Parallel Operations**:
   - Convert messages to ModelMessages format
   - Retrieve context from Supabase (with graceful degradation)
6. **Stream Response**: Generate and stream GPT-4o response with context

## RAG Pipeline

### retrieveContext()
- Generates embedding using OpenAI's text-embedding-3-small
- Searches Supabase for similar documents using pgvector
- Returns array of relevant sources with similarity scores

### buildContextPrompt()
- Formats retrieved sources into prompt context
- Adds source citations ([Fonte 1], [Fonte 2], etc.)
- Injects into system prompt for GPT-4o

### Graceful Degradation
If RAG fails (timeout, database error):
- Log error with `[RAG ERROR]` prefix
- Return empty array for sources
- Continue chat without context
- User gets response but without RAG augmentation

## Response Format

Streaming Server-Sent Events (SSE):
- Each chunk contains partial message content
- Client progressively displays response
- Connection closes when complete

## Dependencies

### Internal
- `@/lib/rag.ts` - RAG context retrieval
- `@/lib/system-prompt.ts` - SOFIA's system prompt
- `@/lib/validation/schemas.ts` - Request validation

### External
- `@ai-sdk/openai` - OpenAI integration for AI SDK
- `ai` - streamText() and utilities
- `zod` - Schema validation

## Environment Variables Required

```
OPENAI_API_KEY=sk-...          # OpenAI API key
SUPABASE_URL=https://...        # Supabase project URL
SUPABASE_ANON_KEY=...           # Supabase anonymous key
```

<!-- MANUAL: -->