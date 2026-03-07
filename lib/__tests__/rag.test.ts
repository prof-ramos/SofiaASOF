import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildContextPrompt, retrieveContextBatch } from '../rag'
import { Source } from '@/types'
import { mockRpc } from '../../test-setup'

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

describe('retrieveContextBatch', () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-key'
    mockRpc.mockReset()
  })

  afterEach(() => {
    // Restaurar process.env.OPENAI_API_KEY para não afetar outros testes
    delete process.env.OPENAI_API_KEY
  })

  it('should use sofia_match_documents RPC, not match_documents', async () => {
    mockRpc.mockResolvedValue({
      data: [],
      error: null
    })

    await retrieveContextBatch(['query1'], 0.5, 5)

    expect(mockRpc).toHaveBeenCalledWith(
      'sofia_match_documents',
      expect.objectContaining({
        query_embedding: expect.any(Array),
        match_threshold: 0.5,
        match_count: 5,
      })
    )
  })

  it('should handle parallel queries efficiently', async () => {
    mockRpc.mockResolvedValue({
      data: [{ id: 1, content: 'result1' }, { id: 2, content: 'result2' }],
      error: null
    })

    const results = await retrieveContextBatch(['query1', 'query2'], 0.5, 5)

    // Função faz uma chamada RPC por query em paralelo
    expect(mockRpc).toHaveBeenCalledTimes(2)
    expect(results).toBeInstanceOf(Map)
    expect(results.size).toBe(2)
  })

  it('should handle duplicate queries gracefully', async () => {
    mockRpc.mockResolvedValue({
      data: [{ id: 1, content: 'result' }],
      error: null
    })

    const results = await retrieveContextBatch(['duplicate', 'duplicate'], 0.5, 5)

    // Uma chamada RPC por elemento do array, mesmo duplicado
    expect(mockRpc).toHaveBeenCalledTimes(2)

    // Map deve ter apenas 1 chave (deduplicação por chave)
    expect(results.size).toBe(1)
    expect(results.has('duplicate')).toBe(true)
  })

  it('should handle RPC errors gracefully', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'RPC function failed', details: 'Invalid query' }
    })

    // Função usa graceful degradation - retorna Map com a query mas array vazio
    const result = await retrieveContextBatch(['query1'], 0.5, 5)
    expect(result).toBeInstanceOf(Map)
    expect(result.size).toBe(1) // Query existe no Map
    expect(result.get('query1')).toEqual([]) // Mas com array vazio
  })
})
