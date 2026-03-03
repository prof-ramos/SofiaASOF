/**
 * Utilitário de Rate Limiting simples in-memory para API Routes do Next.js.
 * Adequado para o tier Free da Vercel (instância única ou baixo tráfego).
 */

interface RateLimitOptions {
  interval: number // janela em milissegundos
  limit: number // máximo de requisições por janela
}

const storage = new Map<string, number[]>()

export function rateLimit(identifier: string, options: RateLimitOptions) {
  const now = Date.now()
  const windowStart = now - options.interval

  // Obter timestamps para este identificador
  let timestamps = storage.get(identifier) || []

  // Filtrar apenas timestamps dentro da janela atual
  timestamps = timestamps.filter((timestamp) => timestamp > windowStart)

  const isRateLimited = timestamps.length >= options.limit

  if (!isRateLimited) {
    timestamps.push(now)
  }

  storage.set(identifier, timestamps)

  // Cleanup periódico do storage (opcional, para evitar vazamento de memória)
  if (storage.size > 1000) {
    for (const [key, value] of storage.entries()) {
      if (value[value.length - 1] < windowStart) {
        storage.delete(key)
      }
    }
  }

  return {
    isRateLimited,
    limit: options.limit,
    remaining: Math.max(0, options.limit - timestamps.length),
    reset: windowStart + options.interval,
  }
}
