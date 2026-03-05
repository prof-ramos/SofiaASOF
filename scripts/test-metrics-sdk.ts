#!/usr/bin/env npx tsx
/**
 * SOFIA Metrics - Test SDK Connection
 * 
 * Testa a conexão e verifica se as tabelas existem
 * Uso: npx tsx scripts/test-metrics-sdk.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Set environment variables:')
  console.error('   export NEXT_PUBLIC_SUPABASE_URL="..."')
  console.error('   export SUPABASE_SERVICE_ROLE_KEY="..."')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function test() {
  console.log('🔍 Testing SOFIA Metrics SDK...\n')
  
  // Test 1: Connection
  console.log('1. Testing connection...')
  const { error: connError } = await supabase.from('sofia_documents').select('id').limit(1)
  if (connError && connError.code !== '42P01') {
    console.log('   ✅ Connected to Supabase')
  } else if (connError?.code === '42P01') {
    console.log('   ⚠️  sofia_documents table not found (expected if not created)')
  }
  
  // Test 2: Check sessions table
  console.log('\n2. Checking sofia_chat_sessions table...')
  const { error: sessionsError } = await supabase
    .from('sofia_chat_sessions')
    .select('id')
    .limit(1)
  
  if (sessionsError) {
    console.log('   ❌ Table not found')
    console.log('   → Run SQL from supabase/metrics-schema.sql')
  } else {
    console.log('   ✅ Table exists')
  }
  
  // Test 3: Check metrics table
  console.log('\n3. Checking sofia_message_metrics table...')
  const { error: metricsError } = await supabase
    .from('sofia_message_metrics')
    .select('id')
    .limit(1)
  
  if (metricsError) {
    console.log('   ❌ Table not found')
  } else {
    console.log('   ✅ Table exists')
  }
  
  // Test 4: Test RPC
  if (!sessionsError && !metricsError) {
    console.log('\n4. Testing RPC function...')
    const { data, error: rpcError } = await supabase.rpc('sofia_log_message_metrics', {
      p_session_id: `sdk_test_${Date.now()}`,
      p_prompt_tokens: 100,
      p_completion_tokens: 200,
      p_latency_ms: 500
    })
    
    if (rpcError) {
      console.log('   ❌ RPC not available:', rpcError.message)
    } else {
      console.log('   ✅ RPC works! ID:', data)
      
      // Get stats
      const { data: stats } = await supabase.rpc('sofia_get_stats', { p_days: 7 })
      console.log('\n📊 Current stats:', stats)
    }
  }
  
  console.log('\n' + '='.repeat(50))
  if (sessionsError || metricsError) {
    console.log('⚠️  Setup incomplete')
    console.log('\nRun this SQL in Supabase:')
    console.log(`  ${SUPABASE_URL.replace('/rest/v1', '')}/project/default/sql`)
    console.log('\nFile: supabase/metrics-schema.sql')
  } else {
    console.log('✅ All systems operational!')
  }
  console.log('='.repeat(50))
}

test()
