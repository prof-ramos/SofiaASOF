-- Rate Limiting persistente para SOFIA
-- Resolve problema de Map in-memory que reseta em restarts da Vercel

-- Tabela de rate limiting
CREATE TABLE IF NOT EXISTS rate_limit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,  -- IP, session_id, ou user_id
  timestamps BIGINT[] NOT NULL DEFAULT '{}',  -- Array de timestamps (ms)
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para queries otimizadas
CREATE INDEX IF NOT EXISTS rate_limit_entries_identifier_idx
  ON rate_limit_entries(identifier, updated_at);

-- Índice para cleanup de entradas antigas
CREATE INDEX IF NOT EXISTS rate_limit_entries_updated_at_idx
  ON rate_limit_entries(updated_at);

-- Comentário para documentar a tabela
COMMENT ON TABLE rate_limit_entries IS 'SOFIA rate limiting: tracking de requests por identifier para prevenir abuse';

-- Função para cleanup automático de entradas antigas (>24h)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limit_entries()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM rate_limit_entries
  WHERE updated_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- Trigger para limpar entries antigas (opcional, pode ser executado periodicamente)
-- Commented por padrão - ativar se necessário via cron job
-- CREATE TRIGGER cleanup_old_rate_limit_trigger
-- AFTER INSERT ON rate_limit_entries
-- FOR EACH STATEMENT
-- EXECUTE FUNCTION cleanup_old_rate_limit_entries();

-- Grant permissions (ajustar conforme necessário)
-- GRANT SELECT, INSERT, UPDATE ON rate_limit_entries TO anon;
-- GRANT USAGE, SELECT ON SEQUENCE rate_limit_entries_id_seq TO anon;
