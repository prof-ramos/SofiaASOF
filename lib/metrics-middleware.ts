/**
 * SOFIA Metrics Middleware
 * 
 * Coleta automática de métricas em cada request
 */

import { NextRequest, NextResponse } from 'next/server'
import { countTokens, logMessageMetrics, checkRateLimit } from './metrics'
import { randomUUID } from 'crypto'

// ── Session Management ───────────────────────────────────────────────────────

export function getSessionId(request: NextRequest): string {
  // Tenta pegar do header
  let sessionId = request.headers.get('x-session-id')

  // Tenta pegar do cookie
  if (!sessionId) {
    sessionId = request.cookies.get('sofia_session')?.value ?? null
  }
  
  // Gera novo se não existir
  if (!sessionId) {
    sessionId = `sess_${randomUUID()}`
  }
  
  return sessionId
}

// ── IP Hashing (privacy-friendly) ────────────────────────────────────────────

export async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(ip + process.env.IP_HASH_SALT || 'sofia-secret')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ── Metrics Wrapper ──────────────────────────────────────────────────────────

export interface MetricsContext {
  sessionId: string
  messageId: string
  startTime: number
  ragStartTime?: number
  ragEndTime?: number
  llmStartTime?: number
  llmEndTime?: number
  promptTokens: number
  chunksRetrieved: number
  ragSources: string[]
}

export function createMetricsContext(sessionId: string): MetricsContext {
  return {
    sessionId,
    messageId: `msg_${randomUUID()}`,
    startTime: Date.now(),
    promptTokens: 0,
    chunksRetrieved: 0,
    ragSources: []
  }
}

export async function finalizeMetrics(
  ctx: MetricsContext,
  response: string,
  model: string = 'gpt-4o-mini',
  metadata?: Record<string, unknown>
): Promise<void> {
  const completionTokens = countTokens(response)
  
  const ragLatency = ctx.ragStartTime && ctx.ragEndTime 
    ? ctx.ragEndTime - ctx.ragStartTime 
    : 0
    
  const llmLatency = ctx.llmStartTime && ctx.llmEndTime
    ? ctx.llmEndTime - ctx.llmStartTime
    : 0
  
  await logMessageMetrics({
    sessionId: ctx.sessionId,
    messageId: ctx.messageId,
    promptTokens: ctx.promptTokens,
    completionTokens,
    latencyMs: Date.now() - ctx.startTime,
    ragLatencyMs: ragLatency,
    llmLatencyMs: llmLatency,
    chunksRetrieved: ctx.chunksRetrieved,
    ragSources: ctx.ragSources,
    model,
    metadata
  })
}

// ── Rate Limiting Middleware ─────────────────────────────────────────────────

export async function withRateLimit(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const sessionId = getSessionId(request)
  
  const { allowed, remaining, resetAt } = await checkRateLimit(sessionId)
  
  if (!allowed) {
    return NextResponse.json(
      { 
        error: 'Rate limit exceeded',
        resetAt: resetAt.toISOString()
      },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': resetAt.toISOString()
        }
      }
    )
  }
  
  const response = await handler()
  
  // Adiciona headers de rate limit
  response.headers.set('X-RateLimit-Remaining', remaining.toString())
  response.headers.set('X-RateLimit-Reset', resetAt.toISOString())
  response.headers.set('X-Session-ID', sessionId)
  
  return response
}

// ── Response Headers ─────────────────────────────────────────────────────────

export function addMetricsHeaders(
  response: NextResponse,
  ctx: MetricsContext
): NextResponse {
  response.headers.set('X-Request-ID', ctx.messageId)
  response.headers.set('X-Response-Time', `${Date.now() - ctx.startTime}ms`)
  return response
}
