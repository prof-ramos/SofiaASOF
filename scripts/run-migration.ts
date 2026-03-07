#!/usr/bin/env npx tsx
/**
 * SOFIA Metrics - Database Migration Runner
 * 
 * Conecta diretamente ao PostgreSQL do Supabase e roda migrations
 * Uso: npx tsx scripts/run-migration.ts
 */

import { Pool } from 'pg'
import * as fs from 'fs'
import * as path from 'path'

// ── Configuração ────────────────────────────────────────────────────────────

// Connection string direta ao PostgreSQL (modo session, não transaction)
const DATABASE_URL = process.env.SUPABASE_DB_URL || 
  'postgresql://postgres.hvmcawefxbkwxfkimxlh:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres'

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

// ── Migrations ───────────────────────────────────────────────────────────────

const MIGRATIONS_DIR = path.join(__dirname, '../supabase/migrations')

const migrations = [
  {
    name: '001_create_sessions_table',
    sql: `
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

CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sofia_chat_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sofia_chat_sessions(created_at);

ALTER TABLE sofia_chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_sessions" ON sofia_chat_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
`
  },
  {
    name: '002_create_metrics_table',
    sql: `
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
CREATE INDEX IF NOT EXISTS idx_metrics_model ON sofia_message_metrics(model);

ALTER TABLE sofia_message_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_metrics" ON sofia_message_metrics
  FOR ALL TO service_role USING (true) WITH CHECK (true);
`
  },
  {
    name: '003_create_functions',
    sql: `
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
  v_prompt_cost := (p_prompt_tokens::DECIMAL / 1000000) * 0.15;
  v_completion_cost := (p_completion_tokens::DECIMAL / 1000000) * 0.60;
  v_total_cost := v_prompt_cost + v_completion_cost;
  
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
  }
]

// ── Migration Tracker ───────────────────────────────────────────────────────

import { PoolClient } from 'pg'

async function ensureMigrationsTable(client: PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS sofia_migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
}

async function isMigrationExecuted(client: PoolClient, name: string): Promise<boolean> {
  const result = await client.query(
    'SELECT 1 FROM sofia_migrations WHERE name = $1',
    [name]
  )
  return result.rows.length > 0
}

async function markMigrationExecuted(client: PoolClient, name: string) {
  await client.query(
    'INSERT INTO sofia_migrations (name) VALUES ($1)',
    [name]
  )
}

// ── Runner ──────────────────────────────────────────────────────────────────

async function runMigrations() {
  console.log('🚀 Running SOFIA Metrics Migrations\n')
  
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    // Ensure migrations table exists
    await ensureMigrationsTable(client)
    
    let executed = 0
    let skipped = 0
    
    for (const migration of migrations) {
      const alreadyExecuted = await isMigrationExecuted(client, migration.name)
      
      if (alreadyExecuted) {
        console.log(`  ⏭️  ${migration.name} (already executed)`)
        skipped++
        continue
      }
      
      console.log(`  ▶️  Running ${migration.name}...`)
      
      try {
        await client.query(migration.sql)
        await markMigrationExecuted(client, migration.name)
        console.log(`  ✅ ${migration.name}`)
        executed++
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.log(`  ❌ ${migration.name}: ${errorMessage}`)
        throw error
      }
    }
    
    await client.query('COMMIT')
    
    console.log(`\n✅ Migrations complete: ${executed} executed, ${skipped} skipped\n`)
    
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  try {
    await runMigrations()
    process.exit(0)
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('\n❌ Migration failed:', errorMessage)
    console.error('\n💡 Make sure SUPABASE_DB_URL is set with your database connection string')
    console.error('   Format: postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres')
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
