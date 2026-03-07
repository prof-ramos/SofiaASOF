/**
 * SOFIA Metrics System
 *
 * Sistema completo de métricas com:
 * - Contagem de tokens (tiktoken)
 * - Latência de RAG e LLM
 * - Custos por request
 * - Persistência no Supabase
 */

import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { get_encoding, Tiktoken } from 'tiktoken'
import { logger } from './logger'

// ── Configuração ────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Preços por modelo (USD por 1M tokens)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  'claude-3-sonnet': { input: 3.00, output: 15.00 },
  'claude-3-opus': { input: 15.00, output: 75.00 },
}

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface MessageMetrics {
  sessionId: string
  messageId?: string
  promptTokens: number
  completionTokens: number
  latencyMs: number
  ragLatencyMs?: number
  llmLatencyMs?: number
  chunksRetrieved?: number
  ragSources?: string[]
  model?: string
  metadata?: Record<string, any>
}

export interface SessionStats {
  totalRequests: number
  uniqueSessions: number
  totalTokens: number
  totalCost: number
  avgLatencyMs: number
  totalChunksRetrieved: number
}

export interface DailyMetrics {
  date: string
  requests: number
  uniqueSessions: number
  tokens: number
  cost: number
  avgLatencyMs: number
  chunks: number
}

// ── Token Counter ────────────────────────────────────────────────────────────

let encoder: Tiktoken | null = null

function getEncoder() {
  if (!encoder) {
    encoder = get_encoding('cl100k_base') // GPT-4/3.5 encoding
  }
  return encoder
}

export function countTokens(text: string): number {
  const enc = getEncoder()
  const tokens = enc.encode(text)
  return tokens.length
}

export function countMessagesTokens(messages: Array<{ role: string; content: string }>): number {
  let total = 0
  for (const msg of messages) {
    total += 4 // message overhead
    total += countTokens(msg.content)
    total += countTokens(msg.role)
  }
  total += 2 // conversation overhead
  return total
}

// ── Metrics Logger ───────────────────────────────────────────────────────────

export async function logMessageMetrics(metrics: MessageMetrics): Promise<string | null> {
  try {
    const model = metrics.model || 'gpt-4o-mini'
    const pricing = MODEL_PRICING[model] || MODEL_PRICING['gpt-4o-mini']
    
    const promptCost = (metrics.promptTokens / 1_000_000) * pricing.input
    const completionCost = (metrics.completionTokens / 1_000_000) * pricing.output
    const totalCost = promptCost + completionCost
    
    const { data, error } = await supabase.rpc('sofia_log_message_metrics', {
      p_session_id: metrics.sessionId,
      p_message_id: metrics.messageId || null,
      p_prompt_tokens: metrics.promptTokens,
      p_completion_tokens: metrics.completionTokens,
      p_latency_ms: metrics.latencyMs,
      p_rag_latency_ms: metrics.ragLatencyMs || 0,
      p_llm_latency_ms: metrics.llmLatencyMs || 0,
      p_chunks_retrieved: metrics.chunksRetrieved || 0,
      p_rag_sources: metrics.ragSources || [],
      p_model: model,
      p_metadata: metrics.metadata || {}
    })
    
    if (error) {
      logger.error('Error logging metrics:', error)
      return null
    }

    return data
  } catch (error) {
    logger.error('Error logging metrics:', error)
    return null
  }
}

// ── Stats Retrieval ───────────────────────────────────────────────────────────

export async function getStats(days: number = 7): Promise<SessionStats | null> {
  try {
    const { data, error } = await supabase.rpc('sofia_get_stats', {
      p_days: days
    })

    if (error) {
      logger.error('Error getting stats:', error)
      return null
    }

    return data?.[0] || null
  } catch (error) {
    logger.error('Error getting stats:', error)
    return null
  }
}

export async function getDashboard(days: number = 30): Promise<DailyMetrics[]> {
  try {
    const { data, error } = await supabase
      .from('sofia_dashboard')
      .select('*')
      .limit(days)

    if (error) {
      logger.error('Error getting dashboard:', error)
      return []
    }

    return data || []
  } catch (error) {
    logger.error('Error getting dashboard:', error)
    return []
  }
}

export async function getRecentSessions(limit: number = 10): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('sofia_chat_sessions')
      .select('*')
      .order('last_activity', { ascending: false })
      .limit(limit)

    if (error) {
      logger.error('Error getting sessions:', error)
      return []
    }

    return data || []
  } catch (error) {
    logger.error('Error getting sessions:', error)
    return []
  }
}

// ── Rate Limiting Helper ─────────────────────────────────────────────────────

export async function checkRateLimit(
  identifier: string,
  maxRequests: number = 20,
  windowMinutes: number = 1
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000)
  
  const { count, error } = await supabase
    .from('sofia_message_metrics')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', identifier)
    .gte('created_at', windowStart.toISOString())

  if (error) {
    logger.error('Error checking rate limit:', error)
    return { allowed: true, remaining: maxRequests, resetAt: new Date(Date.now() + windowMinutes * 60 * 1000) }
  }
  
  const remaining = Math.max(0, maxRequests - (count || 0))
  const allowed = remaining > 0
  
  return {
    allowed,
    remaining,
    resetAt: new Date(Date.now() + windowMinutes * 60 * 1000)
  }
}

// ── Cleanup on process exit ──────────────────────────────────────────────────

if (typeof process !== 'undefined') {
  process.on('exit', () => {
    if (encoder) {
      encoder.free()
    }
  })
}
