export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  createdAt?: Date
}

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
  }
  embedding?: number[]
}

export interface ChatRequest {
  messages: Message[]
}
