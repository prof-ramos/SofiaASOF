<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-05 | Updated: 2026-03-05 -->

# app

## Purpose
Next.js App Router directory containing all routes, layouts, and pages for the SOFIA application. Uses Server Components by default with selective Client Components for interactivity.

## Key Files

| File | Description |
|------|-------------|
| `layout.tsx` | Root layout with metadata and fonts |
| `page.tsx` | Home page with lazy-loaded ChatInterface |
| `globals.css` | Global styles and Tailwind directives |
| `favicon.ico` | Site favicon |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `api/chat/` | Chat API endpoint with RAG (see `api/chat/AGENTS.md`) |
| `test-connection/` | Supabase connection test page |

## For AI Agents

### Working In This Directory
- **Default**: Use Server Components (no 'use client')
- **Client Components**: Only add 'use client' when using hooks (useState, useEffect, etc.)
- **Streaming**: Use Vercel AI SDK's `useChat` hook for chat interfaces
- **Metadata**: Define in `layout.tsx` using Next.js metadata API

### Testing Requirements
- Test Server Components render correctly
- Test Client Components state management
- Verify API routes handle errors gracefully

### Common Patterns
- Keep layouts simple and focused on structure
- Use `Suspense` boundaries for loading states
- Implement error boundaries for graceful degradation

## Dependencies

### Internal
- `@/components/chat/*` - Chat UI components
- `@/lib/rag.ts` - RAG context retrieval
- `@/lib/supabase.ts` - Database client
- `@/lib/validation/schemas.ts` - Zod schemas

### External
- `next` - Framework routing and server components
- `@ai-sdk/react` - Client-side AI SDK hooks
- `react` - UI library

<!-- MANUAL: -->