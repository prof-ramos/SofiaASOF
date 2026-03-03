import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

/**
 * Middleware para aplicar Rate Limiting e segurança às rotas da API.
 */
export function middleware(request: NextRequest) {
  // Aplicar rate limiting apenas na API de Chat
  if (request.nextUrl.pathname.startsWith('/api/chat')) {
    // Identificador único (IP do cliente)
    // Na Vercel, o IP real está no x-forwarded-for ou x-real-ip
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1'

    const { isRateLimited, limit, remaining, reset } = rateLimit(ip, {
      interval: 60 * 1000, // 1 minuto
      limit: 20, // 20 requisições por minuto
    })

    const headers = new Headers({
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': reset.toString(),
    })

    if (isRateLimited) {
      return NextResponse.json(
        {
          error: 'Muitas requisições',
          details:
            'Você atingiu o limite de mensagens permitidas por minuto. Por favor, aguarde um pouco.',
        },
        { status: 429, headers }
      )
    }

    // Adicionar headers de rate limit à resposta de sucesso
    const response = NextResponse.next()
    headers.forEach((value, key) => {
      response.headers.set(key, value)
    })

    return response
  }

  return NextResponse.next()
}

// Configurar o matcher do middleware
export const config = {
  matcher: '/api/:path*',
}
