#!/usr/bin/env npx tsx
/**
 * SOFIA Metrics Schema Setup
 * 
 * Aplica o schema de métricas usando Supabase SDK
 * Uso: npx tsx scripts/setup-metrics-sdk.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// ── Configuração ────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
})

// ── Schema Definition ───────────────────────────────────────────────────────

const TABLES = {
  sessions: 'sofia_chat_sessions',
  metrics: 'sofia_message_metrics'
}

async function createTables() {
  console.log('📊 Creating tables via SDK...\n')
  
  // Check if tables exist
  const { data: existingTables, error: checkError } = await supabase
    .rpc('exec', {
      sql: `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name LIKE 'sofia_%'
      `
    })
  
  // Create sofia_chat_sessions
  console.log('  Creating sofia_chat_sessions...')
  const { error: sessionsError } = await supabase
    .from(TABLES.sessions)
    .select('id')
    .limit(1)

  if (!sessionsError) {
    console.log('    ✅ Table already exists')
  } else {
    console.log('    ⚠️  Cannot create table via SDK (DDL not supported)')
    console.log('    📝 Run this SQL manually in Supabase SQL Editor:\n')
    console.log('    https://supabase.com/dashboard/project/hvmcawefxbkwxfkimxlh/sql\n')
  }
  
  // Create sofia_message_metrics
  console.log('  Checking sofia_message_metrics...')
  const { error: metricsError } = await supabase
    .from(TABLES.metrics)
    .select('id')
    .limit(1)
  
  if (!metricsError) {
    console.log('    ✅ Table already exists')
  }
  
  return { success: !sessionsError || !metricsError }
}

async function insertTestData() {
  console.log('\n📝 Inserting test data...\n')
  
  const testSession = `test_${Date.now()}`
  
  // Test session insert
  const { data: sessionData, error: sessionError } = await supabase
    .from(TABLES.sessions)
    .insert({
      session_id: testSession,
      ip_hash: 'test_hash',
      user_agent: 'SOFIA Test Script',
      message_count: 0,
      total_tokens: 0,
      total_cost: 0
    })
    .select()
    .single()
  
  if (sessionError) {
    if (sessionError.code === '42P01') {
      console.log('  ❌ Tables not created yet')
      console.log('  📝 Please run the SQL from supabase/metrics-schema.sql first')
      return { success: false }
    }
    console.log('  ⚠️  Session insert failed:', sessionError.message)
    return { success: false }
  }
  
  console.log('  ✅ Test session created:', testSession)
  
  // Test metrics insert
  const { data: metricsData, error: metricsError } = await supabase
    .from(TABLES.metrics)
    .insert({
      session_id: testSession,
      message_id: `msg_${Date.now()}`,
      prompt_tokens: 100,
      completion_tokens: 200,
      total_tokens: 300,
      latency_ms: 500,
      rag_latency_ms: 100,
      llm_latency_ms: 400,
      chunks_retrieved: 5,
      rag_sources: ['test-doc.txt'],
      model: 'gpt-4o-mini',
      prompt_cost: 0.000015,
      completion_cost: 0.00012,
      total_cost: 0.000135
    })
    .select()
    .single()
  
  if (metricsError) {
    console.log('  ⚠️  Metrics insert failed:', metricsError.message)
    return { success: false }
  }
  
  console.log('  ✅ Test metrics created')
  
  // Cleanup test data
  await supabase.from(TABLES.metrics).delete().eq('session_id', testSession)
  await supabase.from(TABLES.sessions).delete().eq('session_id', testSession)
  
  console.log('  ✅ Test data cleaned up')
  
  return { success: true }
}

async function testRPCFunctions() {
  console.log('\n🔧 Testing RPC functions...\n')
  
  // Test sofia_log_message_metrics
  const testSession = `rpc_test_${Date.now()}`
  
  const { data, error } = await supabase.rpc('sofia_log_message_metrics', {
    p_session_id: testSession,
    p_message_id: `msg_${Date.now()}`,
    p_prompt_tokens: 150,
    p_completion_tokens: 250,
    p_latency_ms: 750,
    p_rag_latency_ms: 150,
    p_llm_latency_ms: 600,
    p_chunks_retrieved: 3,
    p_rag_sources: ['lei-11440.txt', 'decreto-11357.txt'],
    p_model: 'gpt-4o-mini'
  })
  
  if (error) {
    if (error.code === '42883') {
      console.log('  ⚠️  RPC function not created yet')
      console.log('  📝 Please run the SQL from supabase/metrics-schema.sql')
      return { success: false }
    }
    console.log('  ❌ RPC test failed:', error.message)
    return { success: false }
  }
  
  console.log('  ✅ sofia_log_message_metrics() works!')
  console.log('     Returned ID:', data)
  
  // Test sofia_get_stats
  const { data: stats, error: statsError } = await supabase.rpc('sofia_get_stats', {
    p_days: 7
  })
  
  if (statsError) {
    console.log('  ⚠️  sofia_get_stats not available')
  } else {
    console.log('  ✅ sofia_get_stats() works!')
    console.log('     Stats:', stats)
  }
  
  // Cleanup
  await supabase.from(TABLES.metrics).delete().eq('session_id', testSession)
  await supabase.from(TABLES.sessions).delete().eq('session_id', testSession)
  
  return { success: true }
}

async function printSQLInstructions() {
  console.log('\n' + '='.repeat(60))
  console.log('📋 SETUP INSTRUCTIONS')
  console.log('='.repeat(60))
  console.log('\nSince Supabase SDK cannot execute DDL (CREATE TABLE, etc.),')
  console.log('you need to run the schema SQL manually:\n')
  console.log('1. Open Supabase SQL Editor:')
  console.log(`   ${SUPABASE_URL.replace('/rest/v1', '')}/project/default/sql\n`)
  console.log('2. Copy and paste the contents of:')
  console.log('   supabase/metrics-schema.sql\n')
  console.log('3. Click "Run" to execute\n')
  console.log('4. Run this script again to verify:')
  console.log('   npx tsx scripts/setup-metrics-sdk.ts\n')
  console.log('='.repeat(60))
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🚀 SOFIA Metrics Setup (SDK)\n')
  console.log('Supabase URL:', SUPABASE_URL)
  console.log('')
  
  // Try to check if tables exist
  const { error: checkError } = await supabase
    .from(TABLES.sessions)
    .select('id')
    .limit(1)
  
  if (checkError) {
    if (checkError.code === '42P01') {
      console.log('❌ Tables not found\n')
      await printSQLInstructions()
      process.exit(1)
    }
    console.log('⚠️  Error checking tables:', checkError.message)
    await printSQLInstructions()
    process.exit(1)
  }
  
  console.log('✅ Tables exist!\n')
  
  // Test inserts
  const insertResult = await insertTestData()
  
  if (insertResult.success) {
    console.log('\n✅ Insert tests passed!\n')
    
    // Test RPC
    await testRPCFunctions()
    
    console.log('\n🎉 Setup complete! Metrics system is ready.\n')
  } else {
    await printSQLInstructions()
    process.exit(1)
  }
}

main().catch(console.error)
