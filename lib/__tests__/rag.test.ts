import { describe, it, expect, vi } from 'vitest'
import { buildContextPrompt } from '../rag'
import { Source } from '@/types'

// Mock do supabase para evitar erro de inicialização nos testes
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}))

describe('RAG Utilities', () => {
  it('deve retornar string vazia se não houver fontes', () => {
    const prompt = buildContextPrompt([])
    expect(prompt).toBe('')
  })

  it('deve formatar corretamente as fontes no prompt', () => {
    const sources: Source[] = [
      { title: 'Doc 1', content: 'Conteúdo 1', similarity: 0.9 },
      { title: 'Doc 2', content: 'Conteúdo 2', similarity: 0.8 },
    ]
    const prompt = buildContextPrompt(sources)
    expect(prompt).toContain('[Fonte 1] Doc 1')
    expect(prompt).toContain('Conteúdo 1')
    expect(prompt).toContain('[Fonte 2] Doc 2')
    expect(prompt).toContain('Conteúdo 2')
    expect(prompt).toContain('CONTEXTO RECUPERADO')
  })
})
