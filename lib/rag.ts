import { cache } from 'react'
import OpenAI from 'openai'
import { supabase } from './supabase'
import type { Source } from '@/types'

// Cache the client initialization per request
const getOpenAI = cache(() => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Configuração do Servidor Incompleta: OPENAI_API_KEY ausente.')
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
})

// Cache embedding generation for identical inputs within a request
const generateEmbeddingCached = cache(async (text: string): Promise<number[]> => {
  const openai = getOpenAI()
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.replace(/\n/g, ' '),
  })
  return response.data[0].embedding
})

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    return await generateEmbeddingCached(text)
  } catch (error) {
    console.error('[EMBEDDING ERROR]:', error)
    throw error
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

    const { data, error } = await supabase.rpc('sofia_match_documents', {
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

// NOVA FUNÇÃO: Batch context retrieval para múltiplas queries em paralelo
export async function retrieveContextBatch(
  queries: string[],
  matchThreshold = 0.5,
  matchCount = 5
): Promise<Map<string, Source[]>> {
  const start = Date.now()

  try {
    // Generate all embeddings in parallel com error handling individual
    const embeddings = await Promise.all(
      queries.map(async (query) => {
        try {
          return await generateEmbedding(query)
        } catch (error) {
          console.error(`[EMBEDDING ERROR for query "${query}"]:`, error)
          return null // Marca como falha para este query
        }
      })
    )

    // Query database in parallel com error handling individual
    const results = await Promise.all(
      embeddings.map(async (embedding, index) => {
        if (embedding === null) {
          // Se embedding falhou, retorna resultado vazio
          return { data: [], error: null }
        }
        try {
          const result = await supabase.rpc('match_documents', {
            query_embedding: embedding,
            match_threshold: matchThreshold,
            match_count: matchCount,
          })
          if (result.error) {
            console.error(`[SUPABASE RPC ERROR for query "${queries[index]}"]:`, result.error)
            return { data: [], error: null }
          }
          return result
        } catch (error) {
          console.error(`[SUPABASE RPC ERROR for query "${queries[index]}"]:`, error)
          return { data: [], error: null } // Degradação graciosa
        }
      })
    )

    // Agregar resultados com suporte a queries duplicadas e deduplicação
    const resultMap = new Map<string, Source[]>()

    queries.forEach((query, i) => {
      const existing = resultMap.get(query) ?? []
      const mapped = (results[i].data ?? []).map(
        (row: { content: string; metadata: { title?: string }; similarity: number }) => ({
          title: row.metadata?.title ?? 'Documento',
          content: row.content,
          similarity: row.similarity,
        })
      )

      // Deduplica baseado em content para evitar entradas duplicadas
      const deduped = [...existing, ...mapped].filter((source, index, self) =>
        index === self.findIndex((s) => s.content === source.content)
      )

      resultMap.set(query, deduped)
    })

    const duration = Date.now() - start
    console.log(`[RAG PERFORMANCE]: Batch context retrieved in ${duration}ms (${queries.length} queries)`)

    return resultMap
  } catch (error) {
    console.error('[BATCH RETRIEVE CONTEXT ERROR]:', error)
    // Retorna Map vazio com todas as queries mapeadas para arrays vazios
    return new Map(queries.map(q => [q, []]))
  }
}
