/**
 * Tipos de chat (Message, ChatRequest) são definidos e validados via Zod em:
 * @/lib/validation/schemas.ts
 */

export interface Source {
  title: string
  content: string
  similarity: number
}

export interface DocumentChunk {
  id: string
  content: string
  metadata: {
    source: string
    title: string
    article?: string
    page?: number
    chunkIndex?: number
    totalChunks?: number
  }
  embedding?: number[]
}
