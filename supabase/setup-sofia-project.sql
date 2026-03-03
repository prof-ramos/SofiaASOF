-- ============================================
-- SOFIA ASOF — Setup do Banco de Dados
-- Execute este script no SQL Editor do Supabase
-- Projeto: hvmcawefxbkwxfkimxlh
-- ============================================

-- 1. Habilitar pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Criar tabela de documentos
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

-- 5. Tabela de sessões de chat (para futuras versões)
CREATE TABLE IF NOT EXISTS sofia_chat_sessions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  messages   JSONB       NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sofia_chat_sessions_updated_at
  BEFORE UPDATE ON sofia_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 7. RLS (Row Level Security)
ALTER TABLE sofia_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SOFIA documentos leitura pública"
  ON sofia_documents FOR SELECT
  USING (true);

CREATE POLICY "SOFIA inserção serviço"
  ON sofia_documents FOR INSERT
  WITH CHECK (true);

-- ============================================
-- Verificar se tudo foi criado corretamente:
-- ============================================
-- SELECT * FROM sofia_documents LIMIT 1;
-- SELECT sofia_match_documents('[0,0,0,...]'::vector, 0.5, 5);
