<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-05 | Updated: 2026-03-05 -->

# supabase

## Purpose
Supabase database schema, migrations, and configuration. Contains PostgreSQL schema with pgvector extension for similarity search.

## Key Files

| File | Description |
|------|-------------|
| `schema.sql` | Complete database schema (for reference/reset) |
| `migrations/20260303000000_initial.sql` | Initial migration with notes table and vector search |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `migrations/` | Database migration files (applied in order) |

## For AI Agents

### Working In This Directory
- **Extensions**: Requires `pgvector` extension for vector similarity search
- **Migrations**: Use Supabase CLI: `supabase db push`
- **Schema Changes**: Always create new migrations, don't edit existing ones
- **Testing**: Use `supabase/migrations/` for version control

### Common Patterns
- Use UUIDs for primary keys
- Add `updated_at` and `created_at` timestamps
- Include RLS (Row Level Security) policies
- Index vector columns for performance

## Database Schema

### notes Table
- Stores ASOF knowledge base documents
- `content`: Document text content
- `embedding`: Vector embedding (1536 dimensions, text-embedding-3-small)
- `metadata`: JSONB with title, source, tags
- `similarity`: Computed via `match_documents()` function

### Functions
- `match_documents()`: Vector similarity search using pgvector

## Dependencies

### External
- `supabase` - Database hosting and management
- `pgvector` - Vector similarity search extension
- `postgresql` - Database engine

<!-- MANUAL: -->