<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-05 | Updated: 2026-03-05 -->

# lib

## Purpose
Core library utilities and business logic. Contains RAG implementation, Supabase client, validation schemas, and system prompts for the SOFIA chatbot.

## Key Files

| File | Description |
|------|-------------|
| `rag.ts` | RAG pipeline - embedding generation and context retrieval |
| `supabase.ts` | Supabase client initialization (browser and server) |
| `system-prompt.ts` | SOFIA's system prompt for GPT-4o |
| `rate-limit.ts` | Rate limiting utilities for API protection |
| `utils.ts` | General utility functions (cn, etc.) |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `validation/` | Zod schemas for runtime validation (see `validation/AGENTS.md`) |
| `__tests__/` | Unit tests for library functions |

## For AI Agents

### Working In This Directory
- **Server-side by default**: Most functions run on the server
- **Caching**: Use `React.cache()` for expensive operations (embeddings)
- **Error Handling**: Always wrap external API calls in try/catch
- **Logging**: Use prefixed console logs for debugging ([RAG PERFORMANCE], etc.)

### Testing Requirements
- Unit tests in `__tests__/` subdirectories
- Test error scenarios and edge cases
- Mock external dependencies (OpenAI, Supabase)

### Common Patterns
- Export functions as named exports
- Use JSDoc comments for complex functions
- Return empty arrays/objects for graceful degradation
- Log performance metrics for optimization

## Dependencies

### Internal
- `@/types/index.ts` - TypeScript type definitions

### External
- `openai` - OpenAI API client for embeddings
- `@supabase/supabase-js` - Database and vector search
- `react` - React.cache() for memoization
- `zod` - Schema validation (used in validation/)

## Special Notes

### RAG Pipeline (rag.ts)
- **generateEmbedding()**: Creates embeddings using OpenAI's text-embedding-3-small
- **retrieveContext()**: Searches Supabase for similar documents using pgvector
- **retrieveContextBatch()**: Batch retrieval for multiple queries with error handling
- **buildContextPrompt()**: Formats retrieved sources into prompt context

### System Prompt (system-prompt.ts)
- Defines SOFIA's personality and behavior
- Specifies response language (Portuguese)
- Sets constraints on AI behavior

<!-- MANUAL: -->