import { createOpenAI } from '@ai-sdk/openai'
import { streamText, convertToModelMessages } from 'ai'
import type { UIMessage } from 'ai'
import { retrieveContext, buildContextPrompt } from '@/lib/rag'
import { SOFIA_SYSTEM_PROMPT } from '@/lib/system-prompt'

export const maxDuration = 30

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()

  // Extrair texto da última mensagem do usuário para busca RAG
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
  let contextPrompt = ''

  if (lastUserMessage) {
    const text = lastUserMessage.parts
      .filter(p => p.type === 'text')
      .map(p => (p as { type: 'text'; text: string }).text)
      .join(' ')

    const sources = await retrieveContext(text)
    contextPrompt = buildContextPrompt(sources)
  }

  // Converter UIMessages para ModelMessages (formato esperado pelo LLM)
  const modelMessages = await convertToModelMessages(messages)

  const result = streamText({
    model: openai('gpt-4o'),
    system: SOFIA_SYSTEM_PROMPT + contextPrompt,
    messages: modelMessages,
  })

  return result.toUIMessageStreamResponse()
}
