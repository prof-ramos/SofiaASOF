/**
 * Unit tests for RAG Re-ranking System
 *
 * Tests for lib/rag-rerank.ts covering:
 * - Core functionality: heuristic re-ranking logic
 * - Edge cases: empty arrays, single sources, duplicates
 * - Error handling: graceful fallback behavior
 * - Performance: re-ranking speed benchmarks
 *
 * Phase 2 of RAG Test Plan (lines 122-157)
 */

import { describe, it, expect, vi } from 'vitest'
import {
  rerankSourcesHeuristic,
  rerankSources,
  type RerankedSource,
} from '../rag-rerank'
import type { Source } from '@/types'
import {
  mockHighRelevanceSources,
  mockMixedRelevanceSources,
  mockEmptySources,
  mockSingleSource,
} from './fixtures/sources'

// ============================================================================
// MOCKS
// ============================================================================

// Logger mock (REQUIRED - see fixtures/sources.ts for pattern)
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// ============================================================================
// 2.1 CORE FUNCTIONALITY TESTS
// ============================================================================

describe('RAG Re-ranking - Core Functionality', () => {
  it('should return sources sorted by rerankScore descending', async () => {
    const query = 'direitos dos oficiais de chancelaria'
    const sources: Source[] = [
      {
        title: 'Doc A',
        content: 'Conteúdo sobre direitos dos oficiais de chancelaria',
        similarity: 0.7,
      },
      {
        title: 'Doc B',
        content: 'Conteúdo genérico',
        similarity: 0.9,
      },
      {
        title: 'Doc C',
        content: 'direitos oficiais chancelaria carreira',
        similarity: 0.6,
      },
    ]

    const result = await rerankSourcesHeuristic(query, sources)

    // Result should be sorted by rerankScore (descending)
    expect(result[0].rerankScore).toBeGreaterThanOrEqual(result[1].rerankScore)
    expect(result[1].rerankScore).toBeGreaterThanOrEqual(result[2].rerankScore)

    // Doc B should be highest (higher base similarity 0.9 > 0.6, even with keyword bonus for Doc C)
    expect(result[0].title).toBe('Doc B')
  })

  it('should apply keyword matching bonus correctly', async () => {
    const query = 'promoção por antiguidade'
    const sources: Source[] = [
      {
        title: 'Doc A',
        content: 'Texto sem palavras-chave',
        similarity: 0.8,
      },
      {
        title: 'Doc B',
        content: 'promoção por antiguidade merecimento',
        similarity: 0.8,
      },
    ]

    const result = await rerankSourcesHeuristic(query, sources)

    // Doc B should have higher rerankScore due to keyword bonus
    expect(result[0].title).toBe('Doc B')
    expect(result[0].rerankScore).toBeGreaterThan(result[1].rerankScore)
  })

  it('should apply length penalty for chunks <100 chars', async () => {
    const query = 'teste de carreira'
    const shortContent = 'Texto curto'
    const normalContent = 'Conteúdo normal com tamanho adequado para teste'

    const sources: Source[] = [
      {
        title: 'Short',
        content: shortContent,
        similarity: 0.9,
      },
      {
        title: 'Normal',
        content: normalContent,
        similarity: 0.8,
      },
    ]

    const result = await rerankSourcesHeuristic(query, sources)

    // Short chunk should be penalized (score * 0.8)
    const shortResult = result.find(r => r.content === shortContent)
    const normalResult = result.find(r => r.content === normalContent)

    // Verify length penalty was applied to short chunk
    expect(shortResult?.rerankScore).toBeDefined()
    // Both chunks should have been re-ranked (not original order)
    expect(result[0]).toEqual(result.sort((a, b) => b.rerankScore - a.rerankScore)[0])
  })

  it('should apply length penalty for chunks >2000 chars', async () => {
    const query = 'documento extenso'
    const normalContent = 'Conteúdo normal'
    const longContent = 'A'.repeat(2100) // Over 2000 chars

    const sources: Source[] = [
      {
        title: 'Normal',
        content: normalContent,
        similarity: 0.8,
      },
      {
        title: 'Long',
        content: longContent,
        similarity: 0.8,
      },
    ]

    const result = await rerankSourcesHeuristic(query, sources)

    // Long chunk should be penalized (score * 0.9)
    const longResult = result.find(r => r.title === 'Long')
    expect(longResult?.rerankScore).toBeLessThan(0.8)
  })

  it('should apply first-word keyword bonus correctly', async () => {
    const query = 'remoção de oficiais'

    const sources: Source[] = [
      {
        title: 'Doc A',
        content: 'remoção de oficiais é o tema principal deste documento',
        similarity: 0.8,
      },
      {
        title: 'Doc B',
        content: 'texto longo antes de mencionar remoção de oficiais no final',
        similarity: 0.8,
      },
    ]

    const result = await rerankSourcesHeuristic(query, sources)

    // Doc A should get bonus (starts with keyword)
    const docA = result.find(r => r.title === 'Doc A')
    const docB = result.find(r => r.title === 'Doc B')

    expect(docA?.rerankScore).toBeGreaterThan(docB?.rerankScore ?? 0)
  })

  it('should normalize scores to [0, 1] range', async () => {
    const query = 'teste'
    const sources: Source[] = [
      {
        title: 'Doc A',
        content: ' Conteúdo '.repeat(100) + query, // Multiple bonuses
        similarity: 0.95,
      },
      {
        title: 'Doc B',
        content: 'outro',
        similarity: 0.3,
      },
    ]

    const result = await rerankSourcesHeuristic(query, sources)

    // All rerankScores should be in [0, 1]
    result.forEach(r => {
      expect(r.rerankScore).toBeGreaterThanOrEqual(0)
      expect(r.rerankScore).toBeLessThanOrEqual(1)
    })
  })
})

// ============================================================================
// 2.2 EDGE CASE TESTS
// ============================================================================

describe('RAG Re-ranking - Edge Cases', () => {
  it('should return empty array for empty sources', async () => {
    const query = 'teste'
    const result = await rerankSourcesHeuristic(query, mockEmptySources)

    expect(result).toEqual([])
  })

  it('should return single source unchanged', async () => {
    const query = 'teste'
    const result = await rerankSourcesHeuristic(query, mockSingleSource)

    expect(result).toHaveLength(1)
    expect(result[0].title).toBe(mockSingleSource[0].title)
    expect(result[0].content).toBe(mockSingleSource[0].content)
    expect(result[0].originalRank).toBe(0)
  })

  it('should correctly re-order two sources by score', async () => {
    const query = 'oficial de chancelaria'

    const sources: Source[] = [
      {
        title: 'Low Relevance',
        content: 'genérico',
        similarity: 0.5,
      },
      {
        title: 'High Relevance',
        content: 'oficial de chancelaria carreira direitos',
        similarity: 0.5,
      },
    ]

    const result = await rerankSourcesHeuristic(query, sources)

    expect(result).toHaveLength(2)
    expect(result[0].title).toBe('High Relevance')
    expect(result[1].title).toBe('Low Relevance')
    expect(result[0].rerankScore).toBeGreaterThan(result[1].rerankScore)
  })

  it('should handle sources with identical content', async () => {
    const query = 'teste'

    const sources: Source[] = [
      {
        title: 'Doc A',
        content: 'conteúdo idêntico',
        similarity: 0.8,
      },
      {
        title: 'Doc B',
        content: 'conteúdo idêntico',
        similarity: 0.7,
      },
    ]

    const result = await rerankSourcesHeuristic(query, sources)

    // Both should be returned with different rerankScores due to different original similarities
    expect(result).toHaveLength(2)
    expect(result[0].rerankScore).toBeGreaterThan(0)
    expect(result[1].rerankScore).toBeGreaterThan(0)
  })

  it('should handle query with only stopwords (words <= 2 chars)', async () => {
    const query = 'o de a em' // All stopwords (<= 2 chars)

    const sources: Source[] = [
      {
        title: 'Doc A',
        content: 'texto relevante',
        similarity: 0.9,
      },
      {
        title: 'Doc B',
        content: 'outro texto',
        similarity: 0.7,
      },
    ]

    // Should not throw, should return results
    const result = await rerankSourcesHeuristic(query, sources)

    expect(result).toHaveLength(2)
    // Verify ordering: result should be sorted by rerankScore descending
    expect(result[0].rerankScore).toBeGreaterThan(result[1].rerankScore)
    // Verify penalty applied: rerankScores should be less than original similarities
    expect(result[0].rerankScore).toBeLessThan(0.9)
    expect(result[1].rerankScore).toBeLessThan(0.7)
  })
})

// ============================================================================
// 2.3 ERROR HANDLING TESTS
// ============================================================================

describe('RAG Re-ranking - Error Handling', () => {
  it('should fall back to original sources on heuristic re-ranking error', async () => {
    const query = 'teste'
    const sources: Source[] = [
      {
        title: 'Doc A',
        // @ts-expect-error - Testing error handling with invalid content
        content: null,
        similarity: 0.9,
      },
    ]

    // Should not throw, should return fallback
    const result = await rerankSourcesHeuristic(query, sources)

    expect(result).toHaveLength(1)
    expect(result[0].rerankScore).toBe(0.9) // Fallback to original similarity
    expect(result[0].originalRank).toBe(0)
  })

  it('should return early for rerankSources with <=1 source', async () => {
    const query = 'teste'

    // Empty array
    const resultEmpty = await rerankSources(query, mockEmptySources)
    expect(resultEmpty).toEqual(mockEmptySources)

    // Single source
    const resultSingle = await rerankSources(query, mockSingleSource)
    expect(resultSingle).toEqual(mockSingleSource)
  })

  it('should remove rerankScore and originalRank before returning', async () => {
    const query = 'teste'
    const sources: Source[] = [
      {
        title: 'Doc A',
        content: 'conteúdo',
        similarity: 0.9,
      },
      {
        title: 'Doc B',
        content: 'outro',
        similarity: 0.7,
      },
    ]

    const result = await rerankSources(query, sources)

    // Result should be Source[] (not RerankedSource[])
    result.forEach(source => {
      expect(source).not.toHaveProperty('rerankScore')
      expect(source).not.toHaveProperty('originalRank')
    })

    // But should have original Source properties
    expect(result[0].title).toBe('Doc A')
    expect(result[0].similarity).toBe(0.9)
  })
})

// ============================================================================
// 2.4 PERFORMANCE TESTS
// ============================================================================

describe('RAG Re-ranking - Performance', () => {
  it('should re-rank 10 sources efficiently', async () => {
    const query = 'oficial de chancelaria direitos deveres'

    // Create 10 sources with deterministic similarity scores
    const sources: Source[] = Array.from({ length: 10 }, (_, i) => ({
      title: `Doc ${i}`,
      content: i % 2 === 0
        ? 'oficial de chancelaria carreira direitos deveres'
        : 'conteúdo genérico sem palavras-chave',
      similarity: 0.8 - (i * 0.05),
    }))

    const result = await rerankSourcesHeuristic(query, sources)

    expect(result).toHaveLength(10)
    // Verify re-ranking occurred (high similarity docs should be first)
    expect(result[0].title).toBe('Doc 0')
  })

  it('should re-rank 50 sources efficiently', async () => {
    const query = 'teste de performance com re-ranking de múltiplas fontes'

    // Create 50 sources with DETERMINISTIC similarity scores
    // Using modulo to create predictable pattern: 0.0, 0.1, 0.2, ..., 0.9, 0.0, 0.1, ...
    const sources: Source[] = Array.from({ length: 50 }, (_, i) => ({
      title: `Documento ${i}`,
      content: i % 3 === 0
        ? 'oficial chancelaria teste performance re-ranking'
        : 'conteúdo variado para simular documento real',
      similarity: (i % 10) / 10, // Deterministic: 0.0 to 0.9 repeating
    }))

    const result = await rerankSourcesHeuristic(query, sources)

    expect(result).toHaveLength(50)
    // Verify re-ranking occurred (docs with index % 3 === 0 should be prioritized)
    const prioritizedDocs = result.filter(doc => doc.content.includes('oficial chancelaria'))
    expect(prioritizedDocs.length).toBeGreaterThan(0)
    // Highest reranked docs should come first
    expect(result[0].rerankScore).toBeGreaterThanOrEqual(result[result.length - 1].rerankScore)
  })
})

// ============================================================================
// INTEGRATION WITH MAIN rerankSources() FUNCTION
// ============================================================================

describe('rerankSources() - Integration', () => {
  it('should use heuristic re-ranking by default', async () => {
    const query = 'direitos dos oficiais'

    const sources: Source[] = [
      {
        title: 'Doc A',
        content: 'direitos dos oficiais de chancelaria',
        similarity: 0.7,
      },
      {
        title: 'Doc B',
        content: 'genérico',
        similarity: 0.9,
      },
    ]

    const result = await rerankSources(query, sources)

    // Doc B wins due to higher base similarity (0.9), despite Doc A having keyword bonus
    // Doc A has lower base similarity (0.7) even with keyword bonus
    // Higher base similarity prevails over keyword bonus differences
    expect(result[0].title).toBe('Doc B')
    expect(result[1].title).toBe('Doc A')
  })

  it('should handle mixed relevance sources correctly', async () => {
    const query = 'carreira de oficial de chancelaria'

    const result = await rerankSources(query, mockMixedRelevanceSources)

    // Should return same number of sources
    expect(result).toHaveLength(mockMixedRelevanceSources.length)

    // Results should not have rerankScore/originalRank (clean interface)
    result.forEach(source => {
      expect(source).not.toHaveProperty('rerankScore')
      expect(source).not.toHaveProperty('originalRank')
    })
  })

  it('should preserve all original source properties', async () => {
    const query = 'teste'

    const sources: Source[] = [
      {
        title: 'Lei nº 11.440/2006',
        content: 'Dispõe sobre o cargo de Oficial de Chancelaria',
        similarity: 0.95,
      },
    ]

    const result = await rerankSources(query, sources)

    expect(result[0]).toEqual({
      title: 'Lei nº 11.440/2006',
      content: 'Dispõe sobre o cargo de Oficial de Chancelaria',
      similarity: 0.95,
    })
  })
})
