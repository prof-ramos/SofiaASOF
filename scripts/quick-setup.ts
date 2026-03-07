#!/usr/bin/env npx tsx
/**
 * SOFIA Quick Setup - Roda migration via SDK ou mostra SQL
 * 
 * Uso: 
 *   npx tsx scripts/quick-setup.ts                    # Mostra SQL
 *   SUPABASE_DB_PASSWORD=sua_senha npx tsx scripts/quick-setup.ts  # Roda automático
 */

import { createClient } from '@supabase/supabase-js'
import { Pool } from 'pg'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const SQL = `
-- SOFIA Metrics Schema (Quick Setup)

CREATE TABLE IF NOT EXISTS sofia_message_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  message_id TEXT,
  prompt_tokens INT DEFAULT 0,
  completion_tokens INT DEFAULT 0,
  total_tokens INT DEFAULT 0,
  latency_ms INT DEFAULT 0,
  rag_latency_ms INT DEFAULT 0,
  llm_latency_ms INT DEFAULT 0,
  chunks_retrieved INT DEFAULT 0,
  rag_sources TEXT[] DEFAULT '{}',
  model TEXT DEFAULT 'gpt-4o-mini',
  prompt_cost DECIMAL(10,6) DEFAULT 0,
  completion_cost DECIMAL(10,6) DEFAULT 0,
  total_cost DECIMAL(10,6) DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metrics_session_id ON sofia_message_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_metrics_created_at ON sofia_message_metrics(created_at);

ALTER TABLE sofia_message_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_metrics" ON sofia_message_metrics
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION sofia_log_message_metrics(
  p_session_id TEXT, p_message_id TEXT DEFAULT NULL,
  p_prompt_tokens INT DEFAULT 0, p_completion_tokens INT DEFAULT 0,
  p_latency_ms INT DEFAULT 0, p_rag_latency_ms INT DEFAULT 0,
  p_llm_latency_ms INT DEFAULT 0, p_chunks_retrieved INT DEFAULT 0,
  p_rag_sources TEXT[] DEFAULT '{}', p_model TEXT DEFAULT 'gpt-4o-mini',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE v_id UUID; v_total_cost DECIMAL(10,6);
BEGIN
  v_total_cost := (p_prompt_tokens::DECIMAL / 1000000) * 0.15 + (p_completion_tokens::DECIMAL / 1000000) * 0.60;
  INSERT INTO sofia_message_metrics (
    session_id, message_id, prompt_tokens, completion_tokens, total_tokens,
    latency_ms, rag_latency_ms, llm_latency_ms, chunks_retrieved, rag_sources,
    model, metadata, prompt_cost, completion_cost, total_cost
  ) VALUES (
    p_session_id, p_message_id, p_prompt_tokens, p_completion_tokens, p_prompt_tokens + p_completion_tokens,
    p_latency_ms, p_rag_latency_ms, p_llm_latency_ms, p_chunks_retrieved, p_rag_sources,
    p_model, p_metadata, (p_prompt_tokens::DECIMAL / 1000000) * 0.15, (p_completion_tokens::DECIMAL / 1000000) * 0.60, v_total_cost
  ) RETURNING id INTO v_id;
  INSERT INTO sofia_chat_sessions (session_id, message_count, total_tokens, total_cost)
  VALUES (p_session_id, 1, p_prompt_tokens + p_completion_tokens, v_total_cost)
  ON CONFLICT (session_id) DO UPDATE SET
    message_count = sofia_chat_sessions.message_count + 1,
    total_tokens = sofia_chat_sessions.total_tokens + p_prompt_tokens + p_completion_tokens,
    total_cost = sofia_chat_sessions.total_cost + v_total_cost, last_activity = NOW();
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION sofia_get_stats(p_days INT DEFAULT 7)
RETURNS TABLE (total_requests BIGINT, unique_sessions BIGINT, total_tokens BIGINT, total_cost DECIMAL, avg_latency_ms NUMERIC)
LANGUAGE plpgsql AS $$
BEGIN RETURN QUERY SELECT COUNT(*)::BIGINT, COUNT(DISTINCT session_id)::BIGINT, COALESCE(SUM(total_tokens),0)::BIGINT, COALESCE(SUM(total_cost),0)::DECIMAL, ROUND(AVG(latency_ms),2) FROM sofia_message_metrics WHERE created_at >= NOW() - (p_days || ' days')::INTERVAL; END; $$;
`

async function checkTable() {
  const { error } = await supabase.from('sofia_message_metrics').select('id').limit(1)
  return !error || error.code !== '42P01'
}

async function runMigration() {
  if (!DB_PASSWORD) {
    console.log('\n⚠️  SUPABASE_DB_PASSWORD não definida\n')
    console.log('📋 Para rodar automaticamente, forneça a senha do banco:')
    console.log('   SUPABASE_DB_PASSWORD=sua_senha npx tsx scripts/quick-setup.ts\n')
    console.log('🔗 Ou cole este SQL no Supabase SQL Editor:')
    console.log('   https://supabase.com/dashboard/project/hvmcawefxbkwxfkimxlh/sql\n')
    console.log('─'.repeat(60))
    console.log(SQL)
    console.log('─'.repeat(60))
    return false
  }

  const dbUrl = `postgresql://postgres.hvmcawefxbkwxfkimxlh:${DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`
  const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })

  try {
    console.log('🔌 Conectando ao banco...')
    const client = await pool.connect()
    
    console.log('📝 Executando migration...')
    await client.query(SQL)
    
    client.release()
    console.log('✅ Migration executada com sucesso!\n')
    return true
  } catch (error: unknown) {
    console.error('❌ Erro:', error instanceof Error ? error.message : String(error))
    return false
  } finally {
    await pool.end()
  }
}

async function main() {
  console.log('\n🚀 SOFIA Quick Setup\n')

  const exists = await checkTable()
  if (exists) {
    console.log('✅ Tabela sofia_message_metrics já existe!\n')
    
    // Testar RPC
    const { data, error } = await supabase.rpc('sofia_log_message_metrics', {
      p_session_id: `quick_test_${Date.now()}`,
      p_prompt_tokens: 100, p_completion_tokens: 200, p_latency_ms: 500
    })
    
    if (!error) {
      console.log('✅ RPC sofia_log_message_metrics() funcionando!\n')
      // Cleanup
      await supabase.from('sofia_message_metrics').delete().eq('session_id', `quick_test_${Date.now()}`)
      await supabase.from('sofia_chat_sessions').delete().eq('session_id', `quick_test_${Date.now()}`)
      console.log('🎉 Sistema de métricas pronto para uso!\n')
    } else {
      console.log('⚠️  RPC não disponível, rodando migration...\n')
      await runMigration()
    }
    return
  }

  console.log('❌ Tabela não encontrada, executando setup...\n')
  const success = await runMigration()
  
  if (success) {
    // Validar
    const { error: validateError } = await supabase.rpc('sofia_log_message_metrics', {
      p_session_id: `validation_${Date.now()}`,
      p_prompt_tokens: 100, p_completion_tokens: 200, p_latency_ms: 500
    })
    
    if (!validateError) {
      console.log('✅ Validação bem-sucedida!')
      console.log('🎉 Sistema de métricas pronto!\n')
    }
  }
}

main()
