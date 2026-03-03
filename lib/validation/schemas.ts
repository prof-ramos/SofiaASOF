import { z } from 'zod'
import type { UIMessage } from 'ai'

/**
 * Schema para validar partes de texto das mensagens
 */
const TextPartSchema = z.object({
  type: z.literal('text'),
  text: z.string().max(10000, 'Mensagem muito longa (máximo 10.000 caracteres)'),
})

/**
 * Schema para validar partes de imagem (para suporte futuro)
 */
const ImagePartSchema = z.object({
  type: z.literal('image'),
  image: z.string().url(),
})

/**
 * Schema para validar partes de dados (tool calls, etc)
 */
const DataPartSchema = z.object({
  type: z.literal('data'),
  data: z.unknown(),
})

/**
 * Schema para validar partes de ferramenta
 */
const ToolCallPartSchema = z.object({
  type: z.literal('tool-call'),
  toolCallId: z.string(),
  toolName: z.string(),
  args: z.unknown(),
})

const ToolResultPartSchema = z.object({
  type: z.literal('tool-result'),
  toolCallId: z.string(),
  toolName: z.string(),
  result: z.unknown(),
})

/**
 * Schema para validar qualquer parte da mensagem (text | image | data | tool)
 */
const MessagePartSchema = z.discriminatedUnion('type', [
  TextPartSchema,
  ImagePartSchema,
  DataPartSchema,
  ToolCallPartSchema,
  ToolResultPartSchema,
])

/**
 * Schema para validar uma mensagem individual
 */
const MessageSchema = z.object({
  id: z.string().min(1, 'ID da mensagem é obrigatório'),
  role: z.enum(['user', 'assistant'], {
    errorMap: () => ({ message: 'Role deve ser "user" ou "assistant"' }),
  }),
  parts: z
    .array(MessagePartSchema)
    .min(1, 'Mensagem deve ter pelo menos uma parte')
    .max(20, 'Mensagem não pode ter mais de 20 partes'),
})

/**
 * Schema para validar o payload da requisição /api/chat
 */
export const ChatRequestSchema = z.object({
  messages: z
    .array(MessageSchema)
    .min(1, 'Ao menos uma mensagem é obrigatória')
    .max(50, 'Máximo de 50 mensagens por requisição'),
})

/**
 * Tipo validado pelo schema (uso interno)
 */
type ValidatedMessage = z.infer<typeof MessageSchema>
type ValidatedChatRequest = z.infer<typeof ChatRequestSchema>

/**
 * Função helper para validar requisição de chat
 * @throws {z.ZodError} Se a validação falhar
 */
export function validateChatRequest(data: unknown): ValidatedChatRequest {
  return ChatRequestSchema.parse(data)
}

/**
 * Função helper para validar com resultado seguro (sem exceção)
 */
export function safeValidateChatRequest(
  data: unknown
): { success: true; data: ValidatedChatRequest } | { success: false; error: z.ZodError } {
  const result = ChatRequestSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}

/**
 * Converte mensagens validadas para o tipo UIMessage do Vercel AI SDK
 * Esta função faz type assertion pois o schema Zod valida a estrutura
 * mas o tipo inferido pode não ser 100% compatível com UIMessage
 */
export function toUIMessages(messages: ValidatedMessage[]): UIMessage[] {
  // O Vercel AI SDK processa mensagens com tipos específicos
  // Como validamos a estrutura básica, podemos fazer o cast seguro
  return messages as unknown as UIMessage[]
}
