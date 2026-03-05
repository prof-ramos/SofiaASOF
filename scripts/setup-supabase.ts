/**
 * Setup Supabase for SOFIA via direct Postgres connection
 * Run: npx tsx scripts/setup-supabase.ts
 */

import { Pool } from 'pg'
import fs from 'fs'

const DATABASE_URL = process.env.POSTGRES_URL_NON_POOLING || 
  'postgres://postgres.hvmcawefxbkwxfkimxlh:EXYcOctHfyNqzwUL@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require'

const pool = new Pool({ 
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

const SETUP_SQL = `
-- 1. Habilitar pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Criar tabela de documentos
CREATE TABLE IF NOT EXISTS sofia_documents (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Índice HNSW para busca vetorial
CREATE INDEX IF NOT EXISTS sofia_documents_embedding_idx
  ON sofia_documents USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 4. Função de busca por similaridade
CREATE OR REPLACE FUNCTION sofia_match_documents(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 5
)
RETURNS TABLE (id BIGINT, content TEXT, metadata JSONB, similarity FLOAT)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY SELECT d.id, d.content, d.metadata,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM sofia_documents d
  WHERE 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 5. Tabela de sessões de chat
CREATE TABLE IF NOT EXISTS sofia_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sofia_chat_sessions_updated_at ON sofia_chat_sessions;
CREATE TRIGGER sofia_chat_sessions_updated_at
  BEFORE UPDATE ON sofia_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 7. RLS
ALTER TABLE sofia_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "SOFIA documentos leitura pública" ON sofia_documents;
CREATE POLICY "SOFIA documentos leitura pública" ON sofia_documents FOR SELECT USING (true);
DROP POLICY IF EXISTS "SOFIA inserção serviço" ON sofia_documents;
CREATE POLICY "SOFIA inserção serviço" ON sofia_documents FOR INSERT WITH CHECK (true);
`

async function main() {
  console.log('🚀 Setting up Supabase for SOFIA via Postgres...\n')

  try {
    console.log('Connecting to database...')
    const client = await pool.connect()
    console.log('✅ Connected!\n')

    console.log('Executing setup SQL...')
    await client.query(SETUP_SQL)
    console.log('✅ SQL executed!\n')

    // Verify
    const { rows } = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name LIKE 'sofia_%'
    `)
    
    console.log('📋 Tables created:')
    rows.forEach(r => console.log(`  - ${r.table_name}`))

    client.release()
  } catch (err) {
    console.error('❌ Error:', err)
    process.exit(1)
  } finally {
    await pool.end()
  }

  console.log('\n✅ Setup complete!')
}

main()
