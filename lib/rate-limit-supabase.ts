/**
 * Rate Limiting com persistência no Supabase
 *
 * Vantagens sobre Map in-memory:
 * - Persiste entre restarts da Vercel
 * - Escala horizontalmente (múltiplas instâncias compartilham estado)
 * - Não perde dados em deployments
 *
 * Trade-offs:
 * - Leve overhead de rede (~50-100ms por request)
 * - Depende de disponibilidade do Supabase
 */

import { createClient } from '@supabase/supabase-js'
import { logger } from './logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface RateLimitOptions {
  interval: number  // janela em milissegundos (ex: 60000 = 1 minuto)
  limit: number     // máximo de requisições por janela
}

export interface RateLimitResult {
  isRateLimited: boolean
  limit: number
  remaining: number
  reset: number      // timestamp em ms quando a janela reseta
  identifier: string
}

/**
 * Rate limiting persistente no Supabase
 *
 * @param identifier - Identificador único (IP, session_id, user_id)
 * @param options - Configuração do rate limit
 * @returns Resultado do rate limit check
 */
export async function rateLimitSupabase(
  identifier: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowStart = now - options.interval

  try {
    // Buscar entrada existente
    const { data: existing, error: fetchError } = await supabase
      .from('rate_limit_entries')
      .select('timestamps, id')
      .eq('identifier', identifier)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = row not found (erro esperado)
      logger.error('[RATE_LIMIT ERROR]: Failed to fetch entry:', fetchError)
      // Em caso de erro, falhar abertamente (permite request)
      return {
        isRateLimited: false,
        limit: options.limit,
        remaining: options.limit,
        reset: windowStart + options.interval,
        identifier
      }
    }

    // Extrair timestamps existentes ou iniciar array vazio
    let timestamps = existing?.timestamps || []

    // Filtrar apenas timestamps dentro da janela atual
    timestamps = timestamps.filter((timestamp: number) => timestamp > windowStart)

    // Verificar se excedeu limite
    const isRateLimited = timestamps.length >= options.limit

    if (!isRateLimited) {
      // Adicionar timestamp atual
      timestamps.push(now)
    }

    // Persistir no Supabase
    const { error: upsertError } = await supabase
      .from('rate_limit_entries')
      .upsert({
        identifier,
        timestamps,
        updated_at: new Date().toISOString()
      })

    if (upsertError) {
      logger.error('[RATE_LIMIT ERROR]: Failed to upsert entry:', upsertError)
      // Em caso de erro no upsert, ainda assim retornar resultado baseado em memória
      // (mas não pode ser confiado para persistência)
    }

    // Cleanup periódico (1 em cada 100 requests)
    if (Math.random() < 0.01) {
      cleanupOldEntries().catch(err => {
        logger.error('[RATE_LIMIT CLEANUP ERROR]:', err)
      })
    }

    return {
      isRateLimited,
      limit: options.limit,
      remaining: Math.max(0, options.limit - timestamps.length),
      reset: windowStart + options.interval,
      identifier
    }

  } catch (error) {
    logger.error('[RATE_LIMIT ERROR]: Unexpected error:', error)
    // Em caso de erro crítico, falhar abertamente (não bloquear usuários)
    return {
      isRateLimited: false,
      limit: options.limit,
      remaining: options.limit,
      reset: windowStart + options.interval,
      identifier
    }
  }
}

/**
 * Cleanup de entradas antigas (>24h)
 * Executado periodicamente (1% das chamadas)
 */
async function cleanupOldEntries(): Promise<void> {
  try {
    const { error } = await supabase.rpc('cleanup_old_rate_limit_entries')

    if (error) {
      logger.error('[RATE_LIMIT CLEANUP ERROR]: RPC failed:', error)
    }
  } catch (error) {
    logger.error('[RATE_LIMIT CLEANUP ERROR]: Unexpected error:', error)
  }
}

/**
 * Verificar rate limit para um identifier
 * Wrapper compatível com API existente
 */
export async function checkRateLimit(
  identifier: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  return rateLimitSupabase(identifier, options)
}

/**
 * Reset rate limit para um identifier (admin function)
 * Útil para debugging ou manual intervention
 */
export async function resetRateLimit(identifier: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('rate_limit_entries')
      .delete()
      .eq('identifier', identifier)

    if (error) {
      logger.error('[RATE_LIMIT RESET ERROR]:', error)
      return false
    }

    logger.log(`[RATE_LIMIT RESET]: Reset rate limit for ${identifier}`)
    return true
  } catch (error) {
    logger.error('[RATE_LIMIT RESET ERROR]:', error)
    return false
  }
}

/**
 * Obter estatísticas de rate limit para um identifier
 */
export async function getRateLimitStats(identifier: string): Promise<{
  count: number
  oldestTimestamp?: number
  newestTimestamp?: number
} | null> {
  try {
    const { data, error } = await supabase
      .from('rate_limit_entries')
      .select('timestamps')
      .eq('identifier', identifier)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Row not found (sem requests ainda)
        return { count: 0 }
      }
      logger.error('[RATE_LIMIT STATS ERROR]:', error)
      return null
    }

    const timestamps = data?.timestamps || []
    const now = Date.now()
    const oneHourAgo = now - (60 * 60 * 1000)
    const recentTimestamps = timestamps.filter((t: number) => t > oneHourAgo)

    return {
      count: recentTimestamps.length,
      oldestTimestamp: timestamps[0],
      newestTimestamp: timestamps[timestamps.length - 1]
    }
  } catch (error) {
    logger.error('[RATE_LIMIT STATS ERROR]:', error)
    return null
  }
}
