-- SOFIA ASOF — Migração inicial
-- Aplicada automaticamente pelo Supabase CLI: supabase db push

-- 1. Habilitar a extensão pgvector para busca vetorial
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Tabela principal de documentos (chunks indexados)
CREATE TABLE IF NOT EXISTS documents (
  id           BIGSERIAL PRIMARY KEY,
  content      TEXT             NOT NULL,
  metadata     JSONB            DEFAULT '{}',
  embedding    VECTOR(1536),            -- dimensão do text-embedding-3-small
  created_at   TIMESTAMPTZ      DEFAULT NOW()
);

-- 3. Índice HNSW para busca vetorial eficiente
CREATE INDEX IF NOT EXISTS documents_embedding_idx
  ON documents
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 4. Função de busca por similaridade semântica
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding  VECTOR(1536),
  match_threshold  FLOAT   DEFAULT 0.7,
  match_count      INT     DEFAULT 5
)
RETURNS TABLE (
  id          BIGINT,
  content     TEXT,
  metadata    JSONB,
  similarity  FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM documents d
  WHERE 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 5. RLS (Row Level Security) — documentos são somente leitura para todos
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Documentos são leitura pública"
  ON documents FOR SELECT
  USING (true);

CREATE POLICY "Inserção restrita ao serviço"
  ON documents FOR INSERT
  WITH CHECK (true);

-- 6. Tabela de histórico de chat (para futuras versões com auth)
CREATE TABLE IF NOT EXISTS chat_sessions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  messages   JSONB       NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
