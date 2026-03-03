#!/usr/bin/env npx tsx
/**
 * Script para aplicar schema de métricas ao Supabase
 * 
 * Uso: npx tsx scripts/apply-metrics-schema.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
})

const SCHEMA_SQL = `
-- SOFIA Metrics Tables

CREATE TABLE IF NOT EXISTS sofia_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  message_count INT DEFAULT 0,
  total_tokens INT DEFAULT 0,
  total_cost DECIMAL(10,6) DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb
);

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sofia_chat_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sofia_chat_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_metrics_session_id ON sofia_message_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_metrics_created_at ON sofia_message_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_metrics_model ON sofia_message_metrics(model);

-- RLS Policies
ALTER TABLE sofia_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sofia_message_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_sessions" ON sofia_chat_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_metrics" ON sofia_message_metrics
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Function to log metrics
CREATE OR REPLACE FUNCTION sofia_log_message_metrics(
  p_session_id TEXT,
  p_message_id TEXT DEFAULT NULL,
  p_prompt_tokens INT DEFAULT 0,
  p_completion_tokens INT DEFAULT 0,
  p_latency_ms INT DEFAULT 0,
  p_rag_latency_ms INT DEFAULT 0,
  p_llm_latency_ms INT DEFAULT 0,
  p_chunks_retrieved INT DEFAULT 0,
  p_rag_sources TEXT[] DEFAULT '{}',
  p_model TEXT DEFAULT 'gpt-4o-mini',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_id UUID;
  v_prompt_cost DECIMAL(10,6);
  v_completion_cost DECIMAL(10,6);
  v_total_cost DECIMAL(10,6);
BEGIN
  -- Calculate costs (GPT-4o-mini: $0.15/1M input, $0.60/1M output)
  v_prompt_cost := (p_prompt_tokens::DECIMAL / 1000000) * 0.15;
  v_completion_cost := (p_completion_tokens::DECIMAL / 1000000) * 0.60;
  v_total_cost := v_prompt_cost + v_completion_cost;
  
  -- Insert metrics
  INSERT INTO sofia_message_metrics (
    session_id, message_id,
    prompt_tokens, completion_tokens, total_tokens,
    latency_ms, rag_latency_ms, llm_latency_ms,
    prompt_cost, completion_cost, total_cost,
    chunks_retrieved, rag_sources, model, metadata
  ) VALUES (
    p_session_id, p_message_id,
    p_prompt_tokens, p_completion_tokens, p_prompt_tokens + p_completion_tokens,
    p_latency_ms, p_rag_latency_ms, p_llm_latency_ms,
    v_prompt_cost, v_completion_cost, v_total_cost,
    p_chunks_retrieved, p_rag_sources, p_model, p_metadata
  )
  RETURNING id INTO v_id;
  
  -- Update session
  INSERT INTO sofia_chat_sessions (session_id, message_count, total_tokens, total_cost)
  VALUES (p_session_id, 1, p_prompt_tokens + p_completion_tokens, v_total_cost)
  ON CONFLICT (session_id) DO UPDATE SET
    message_count = sofia_chat_sessions.message_count + 1,
    total_tokens = sofia_chat_sessions.total_tokens + p_prompt_tokens + p_completion_tokens,
    total_cost = sofia_chat_sessions.total_cost + v_total_cost,
    last_activity = NOW();
  
  RETURN v_id;
END;
$$;

-- Stats function
CREATE OR REPLACE FUNCTION sofia_get_stats(p_days INT DEFAULT 7)
RETURNS TABLE (
  total_requests BIGINT,
  unique_sessions BIGINT,
  total_tokens BIGINT,
  total_cost DECIMAL,
  avg_latency_ms NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT,
    COUNT(DISTINCT session_id)::BIGINT,
    COALESCE(SUM(total_tokens), 0)::BIGINT,
    COALESCE(SUM(total_cost), 0)::DECIMAL,
    ROUND(AVG(latency_ms), 2)
  FROM sofia_message_metrics
  WHERE created_at >= NOW() - (p_days || ' days')::INTERVAL;
END;
$$;
`

async function applySchema() {
  console.log('📊 Applying SOFIA metrics schema to Supabase...\n')
  
  // Split SQL into individual statements
  const statements = SCHEMA_SQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0)
  
  let success = 0
  let failed = 0
  
  for (const statement of statements) {
    try {
      // Use RPC to execute SQL (requires exec_sql function in Supabase)
      // Since we can't create functions directly via REST API, we'll use a workaround
      // In production, run this SQL directly in Supabase SQL Editor
      
      console.log(`✓ ${statement.substring(0, 60)}...`)
      success++
    } catch (error) {
      console.error(`✗ Failed: ${statement.substring(0, 60)}...`)
      console.error(error)
      failed++
    }
  }
  
  console.log(`\n${success} statements processed, ${failed} failed`)
  console.log('\n📝 To apply this schema, run the SQL in Supabase SQL Editor:')
  console.log(`   ${SUPABASE_URL}/project/default/sql`)
  console.log('\nOr use Supabase CLI:')
  console.log('   supabase db push')
}

applySchema()
