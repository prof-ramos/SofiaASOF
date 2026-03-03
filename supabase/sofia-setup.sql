-- SOFIA ASOF — Tabela específica para base de conhecimento

-- 1. Habilitar pgvector (se não estiver habilitado)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Criar tabela para documentos da SOFIA
CREATE TABLE IF NOT EXISTS sofia_documents (
  id           BIGSERIAL PRIMARY KEY,
  content      TEXT             NOT NULL,
  metadata     JSONB            DEFAULT '{}',
  embedding    VECTOR(1536),
  created_at   TIMESTAMPTZ      DEFAULT NOW()
);

-- 3. Índice HNSW para busca vetorial
CREATE INDEX IF NOT EXISTS sofia_documents_embedding_idx
  ON sofia_documents
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 4. Função de busca por similaridade
CREATE OR REPLACE FUNCTION sofia_match_documents(
  query_embedding  VECTOR(1536),
  match_threshold  FLOAT   DEFAULT 0.5,
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
  FROM sofia_documents d
  WHERE 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 5. RLS
ALTER TABLE sofia_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SOFIA documentos leitura pública"
  ON sofia_documents FOR SELECT
  USING (true);

CREATE POLICY "SOFIA inserção serviço"
  ON sofia_documents FOR INSERT
  WITH CHECK (true);
