<!-- Generated: 2026-03-05 | Updated: 2026-03-05 -->

# SofiaASOF

## Purpose
SOFIA (Serviço de Orientação e Funções de Inteligência Artificial) is an AI-powered chatbot for ASOF (Associação dos Oficiais de Chancelaria). Built with Next.js 16, React 19, and OpenAI GPT-4o, it provides RAG-based (Retrieval Augmented Generation) responses about diplomatic careers, legislation, and Brazil's Foreign Service.

## Key Files

| File | Description |
|------|-------------|
| `package.json` | Project dependencies and scripts (pnpm) |
| `tsconfig.json` | TypeScript configuration |
| `next.config.ts` | Next.js configuration |
| `tailwind.config.ts` | Tailwind CSS configuration |
| `.env.local.example` | Environment variables template |
| `PRD.md` | Product Requirements Document |
| `README.md` | Project overview and setup instructions |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `app/` | Next.js App Router structure (see `app/AGENTS.md`) |
| `components/` | React components - chat UI and shadcn/ui (see `components/AGENTS.md`) |
| `lib/` | Core utilities - RAG, Supabase, validation (see `lib/AGENTS.md`) |
| `docs/` | Project documentation (see `docs/AGENTS.md`) |
| `supabase/` | Database schema and migrations (see `supabase/AGENTS.md`) |
| `scripts/` | Build and setup scripts |
| `types/` | TypeScript type definitions |
| `public/` | Static assets (SVG icons) |

## For AI Agents

### Working In This Directory
- **Package Manager**: Uses `pnpm` (not npm or yarn)
- **Framework**: Next.js 16 with App Router (not Pages Router)
- **Styling**: Tailwind CSS with custom emerald color scheme
- **Language**: Portuguese (pt-BR) for all user-facing content
- **Validation**: Zod schemas for runtime type safety

### Testing Requirements
- Run `pnpm test` to execute Vitest test suites
- Run `pnpm run build` to verify production build
- Run `pnpm run lint` for ESLint checks

### Common Patterns
- Server Components by default (no 'use client' unless needed)
- Proper error boundaries with graceful degradation
- Memoization with React.memo() for performance
- Dynamic imports for code splitting

## Project Structure Notes

### Architecture
- **RAG Pipeline**: `lib/rag.ts` handles document retrieval and embedding generation
- **Chat API**: `app/api/chat/route.ts` processes messages with RAG context
- **Client Components**: `components/chat/` handles UI state and user interactions
- **Database**: Supabase PostgreSQL with pgvector for similarity search

### Key Technologies
- **Next.js 16.1.6**: App Router with Turbopack
- **React 19.2.3**: Server Components and Suspense
- **AI SDK**: Vercel AI SDK for streaming responses
- **OpenAI**: GPT-4o for chat responses, text-embedding-3-small for embeddings
- **Supabase**: Database and vector similarity search
- **Zod**: Runtime validation for API requests

### Environment Variables Required
```
OPENAI_API_KEY=sk-...           # OpenAI API key for chat and embeddings
SUPABASE_URL=https://...         # Supabase project URL
SUPABASE_ANON_KEY=...            # Supabase anonymous key
```

## Dependencies

### External
- `next@16.1.6` - React framework
- `react@19.2.3` - UI library
- `@ai-sdk/openai` - OpenAI integration for AI SDK
- `ai` - Vercel AI SDK for streaming
- `openai` - OpenAI API client
- `@supabase/supabase-js` - Supabase client
- `zod` - Schema validation
- `vitest` - Testing framework

<!-- MANUAL: Custom project notes can be added below -->