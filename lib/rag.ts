import OpenAI from 'openai'
import { supabase } from './supabase'
import type { Source } from '@/types'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.replace(/\n/g, ' '),
  })
  return response.data[0].embedding
}

export async function retrieveContext(
  query: string,
  matchThreshold = 0.5,
  matchCount = 5,
): Promise<Source[]> {
  const embedding = await generateEmbedding(query)

  const { data, error } = await supabase.rpc('match_documents', {
    query_embedding: embedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
  })

  if (error) {
    console.error('Erro na busca vetorial:', error)
    return []
  }

  return (data ?? []).map(
    (row: { content: string; metadata: { title?: string }; similarity: number }) => ({
      title: row.metadata?.title ?? 'Documento',
      content: row.content,
      similarity: row.similarity,
    }),
  )
}

export function buildContextPrompt(sources: Source[]): string {
  if (sources.length === 0) return ''

  const blocks = sources
    .map(
      (s, i) =>
        `[Fonte ${i + 1}] ${s.title}\n${s.content}`,
    )
    .join('\n\n---\n\n')

  return `\n\nCONTEXTO RECUPERADO DA BASE DE CONHECIMENTO:\n\n${blocks}\n\n---\n`
}
