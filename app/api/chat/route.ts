import { createOpenAI } from '@ai-sdk/openai'
import { streamText, convertToModelMessages } from 'ai'
import type { TextUIPart } from 'ai'
import { retrieveContext, buildContextPrompt } from '@/lib/rag'
import { SOFIA_SYSTEM_PROMPT } from '@/lib/system-prompt'
import { safeValidateChatRequest, toUIMessages } from '@/lib/validation/schemas'
import { rateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

export const maxDuration = 30

// Rate limit config: 20 requests per minute per IP
const RATE_LIMIT_CONFIG = { interval: 60_000, limit: 20 }

function getClientIdentifier(req: Request): string {
  // Try various headers for client IP (Vercel, Cloudflare, etc.)
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIp = req.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // Fallback to a default identifier (not ideal but prevents crashes)
  return 'anonymous'
}

export async function POST(req: Request) {
  // 0. Rate limiting
  const clientId = getClientIdentifier(req)
  const rateCheck = rateLimit(clientId, RATE_LIMIT_CONFIG)

  if (rateCheck.isRateLimited) {
    return new Response(
      JSON.stringify({
        error: 'Limite de requisições excedido',
        details: `Aguarde ${Math.ceil((rateCheck.reset - Date.now()) / 1000)}s antes de tentar novamente.`,
        retryAfter: Math.ceil((rateCheck.reset - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((rateCheck.reset - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(rateCheck.limit),
          'X-RateLimit-Remaining': String(rateCheck.remaining),
          'X-RateLimit-Reset': String(rateCheck.reset),
        },
      }
    )
  }

  // 1. Iniciar parsing imediatamente (paralelo à validação)
  const parsePromise = req.json()

  // 2. Validar API key
  if (!process.env.OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'Configuração do Servidor Incompleta: OPENAI_API_KEY ausente.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 2.5 Inicializar cliente OpenAI (sincrono, bloqueio zero)
  // NOTA: createOpenAI() é da Vercel AI SDK, difere de new OpenAI() do SDK nativo
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })

  // 3. Parse e validar corpo da requisição
  let requestBody: unknown
  try {
    requestBody = await parsePromise
  } catch {
    return new Response(
      JSON.stringify({
        error: 'JSON inválido',
        details: 'O corpo da requisição deve ser um JSON válido'
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 3. Validar schema com Zod
  const validationResult = safeValidateChatRequest(requestBody)
  if (!validationResult.success) {
    const error = validationResult.error
    const formattedErrors = error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }))

    return new Response(
      JSON.stringify({
        error: 'Dados inválidos',
        details: formattedErrors
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const { messages } = validationResult.data

  // 4. Converter mensagens validadas para UIMessage[]
  const uiMessages = toUIMessages(messages)

  // Extrair texto da última mensagem do usuário para busca RAG
  const lastUserMessage = [...uiMessages].reverse().find((m) => m.role === 'user')

  // Paralelizar RAG e conversão de mensagens com graceful degradation
  const ragPromise = lastUserMessage
    ? retrieveContext(
        lastUserMessage.parts
          .filter((p): p is TextUIPart => p.type === 'text')
          .map((p) => p.text)
          .join(' ')
      ).catch((error) => {
        logger.error('[RAG ERROR]: Context retrieval failed, proceeding without context:', error)
        return [] // Degradação graciosa - retorna vazio em caso de erro
      })
    : Promise.resolve([])

  const [modelMessages, sources] = await Promise.all([
    convertToModelMessages(uiMessages),
    ragPromise
  ])

  const contextPrompt = lastUserMessage ? buildContextPrompt(sources) : ''

  const result = streamText({
    model: openai('gpt-4o'),
    system: SOFIA_SYSTEM_PROMPT + contextPrompt,
    messages: modelMessages,
  })

  return result.toUIMessageStreamResponse()
}
