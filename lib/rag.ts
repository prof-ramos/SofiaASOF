import OpenAI from 'openai'
import { supabase } from './supabase'
import type { Source } from '@/types'

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Configuração do Servidor Incompleta: OPENAI_API_KEY ausente.')
  }
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.replace(/\n/g, ' '),
    })
    return response.data[0].embedding
  } catch (error) {
    console.error('[EMBEDDING ERROR]:', error)
    throw error // Repropagar para o retrieveContext tratar
  }
}

export async function retrieveContext(
  query: string,
  matchThreshold = 0.5,
  matchCount = 5
): Promise<Source[]> {
  const start = Date.now()
  try {
    const embedding = await generateEmbedding(query)

    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
    })

    if (error) {
      console.error('[SUPABASE RPC ERROR]:', error)
      return []
    }

    const duration = Date.now() - start
    console.log(`[RAG PERFORMANCE]: Context retrieved in ${duration}ms`)

    return (data ?? []).map(
      (row: { content: string; metadata: { title?: string }; similarity: number }) => ({
        title: row.metadata?.title ?? 'Documento',
        content: row.content,
        similarity: row.similarity,
      })
    )
  } catch (err) {
    console.error('[RETRIEVE CONTEXT ERROR]:', err)
    return [] // Degradação graciosa
  }
}

export function buildContextPrompt(sources: Source[]): string {
  if (sources.length === 0) return ''

  const blocks = sources
    .map((s, i) => `[Fonte ${i + 1}] ${s.title}\n${s.content}`)
    .join('\n\n---\n\n')

  return `\n\nCONTEXTO RECUPERADO DA BASE DE CONHECIMENTO:\n\n${blocks}\n\n---\n`
}
