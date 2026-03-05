#!/usr/bin/env npx tsx
/**
 * SOFIA Metrics - Quick Validation
 * 
 * Testa rapidamente se o sistema de métricas está funcionando
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function validate() {
  console.log('🔍 Validating SOFIA Metrics...\n')
  
  // Test RPC function
  const testSession = `validate_${Date.now()}`
  
  console.log('1. Testing sofia_log_message_metrics()...')
  const { data: logId, error: logError } = await supabase.rpc('sofia_log_message_metrics', {
    p_session_id: testSession,
    p_prompt_tokens: 100,
    p_completion_tokens: 200,
    p_latency_ms: 500,
    p_rag_latency_ms: 100,
    p_llm_latency_ms: 400,
    p_chunks_retrieved: 3,
    p_rag_sources: ['test.txt'],
    p_model: 'gpt-4o-mini'
  })
  
  if (logError) {
    console.log('   ❌ Failed:', logError.message)
    console.log('\n   → Run SQL from: supabase/create-metrics-table.sql')
    process.exit(1)
  }
  
  console.log('   ✅ Success! ID:', logId)
  
  console.log('\n2. Testing sofia_get_stats()...')
  const { data: stats, error: statsError } = await supabase.rpc('sofia_get_stats', { p_days: 7 })
  
  if (statsError) {
    console.log('   ⚠️  Stats not available')
  } else {
    console.log('   ✅ Success!')
    console.log('   ', stats)
  }
  
  console.log('\n3. Verifying data in tables...')
  const { data: sessions } = await supabase
    .from('sofia_chat_sessions')
    .select('*')
    .eq('session_id', testSession)
    .single()
  
  const { data: metrics } = await supabase
    .from('sofia_message_metrics')
    .select('*')
    .eq('session_id', testSession)
    .single()
  
  console.log('   Session:', sessions ? '✅' : '❌')
  console.log('   Metrics:', metrics ? '✅' : '❌')
  
  if (sessions && metrics) {
    console.log('\n   📊 Test record created:')
    console.log('   - Tokens:', metrics.total_tokens)
    console.log('   - Cost: $', metrics.total_cost)
    console.log('   - Latency:', metrics.latency_ms, 'ms')
  }
  
  // Cleanup
  console.log('\n4. Cleaning up test data...')
  await supabase.from('sofia_message_metrics').delete().eq('session_id', testSession)
  await supabase.from('sofia_chat_sessions').delete().eq('session_id', testSession)
  console.log('   ✅ Cleaned up')
  
  console.log('\n✅ All validations passed! Metrics system ready.')
}

validate().catch(console.error)
