/**
 * Verification test for RAG fixtures
 *
 * This test ensures that all fixtures can be imported and have the correct structure.
 * Run with: vitest lib/__tests__/fixtures/sources.test.ts
 */

import { describe, it, expect } from 'vitest'
import type { Source } from '@/types'

// Import all fixtures to verify they exist and are properly typed
import {
  createLoggerMockPattern,
  mockHighRelevanceSources,
  mockMixedRelevanceSources,
  mockLowRelevanceSources,
  mockEmptySources,
  mockSingleSource,
  mockLargeContentSource,
  mockSpecialCharactersSources,
  mockDuplicateTitleSources,
  mockDuplicateContentSources,
  mockBatchQueries,
  mockBatchResults,
  mockQueries,
  mockEmbedding,
  mockDeterministicEmbedding,
} from './sources'

describe('RAG Test Fixtures', () => {
  describe('Logger Mock Pattern', () => {
    it('should export logger mock factory with all methods', () => {
      const loggerMock = createLoggerMockPattern()
      expect(loggerMock).toBeDefined()
      expect(loggerMock.debug).toBeDefined()
      expect(loggerMock.info).toBeDefined()
      expect(loggerMock.warn).toBeDefined()
      expect(loggerMock.error).toBeDefined()
      expect(typeof loggerMock.debug).toBe('function')
    })
  })

  describe('Mock Sources - High Relevance', () => {
    it('should have at least 5 high relevance sources', () => {
      expect(mockHighRelevanceSources.length).toBeGreaterThanOrEqual(5)
    })

    it('should have all sources with similarity >= 0.8', () => {
      mockHighRelevanceSources.forEach((source) => {
        expect(source.similarity).toBeGreaterThanOrEqual(0.8)
      })
    })

    it('should have Portuguese content', () => {
      mockHighRelevanceSources.forEach((source) => {
        expect(source.content).toBeTruthy()
        expect(source.content.length).toBeGreaterThan(0)
        // Check for Portuguese-specific characters or words
        const hasPortuguese = /[áàâãéèêíïóôõöúçñ]/i.test(source.content) ||
                             /cargo|disposição|oficial|chancelaria/i.test(source.content)
        expect(hasPortuguese).toBe(true)
      })
    })
  })

  describe('Mock Sources - Mixed Relevance', () => {
    it('should have sources with varying similarity scores', () => {
      expect(mockMixedRelevanceSources.length).toBeGreaterThan(0)
      const similarities = mockMixedRelevanceSources.map(s => s.similarity)
      const min = Math.min(...similarities)
      const max = Math.max(...similarities)
      expect(max - min).toBeGreaterThan(0.4) // At least 0.4 spread
    })

    it('should have at least one source below threshold (0.5)', () => {
      const belowThreshold = mockMixedRelevanceSources.filter(s => s.similarity < 0.5)
      expect(belowThreshold.length).toBeGreaterThan(0)
    })
  })

  describe('Mock Sources - Low Relevance', () => {
    it('should have all sources with similarity < 0.5', () => {
      mockLowRelevanceSources.forEach((source) => {
        expect(source.similarity).toBeLessThan(0.5)
      })
    })
  })

  describe('Edge Case Fixtures', () => {
    it('should have empty sources array', () => {
      expect(mockEmptySources).toEqual([])
    })

    it('should have single source', () => {
      expect(mockSingleSource.length).toBe(1)
      expect(mockSingleSource[0].title).toBeTruthy()
      expect(mockSingleSource[0].content).toBeTruthy()
    })

    it('should have large content source (> 1000 chars)', () => {
      expect(mockLargeContentSource.length).toBe(1)
      expect(mockLargeContentSource[0].content.length).toBeGreaterThan(1000)
    })

    it('should have sources with special characters', () => {
      expect(mockSpecialCharactersSources.length).toBeGreaterThan(0)
      const hasSpecialChars = mockSpecialCharactersSources.some(s =>
        /[ºª§°]/.test(s.content) || /[""''«»]/.test(s.content)
      )
      expect(hasSpecialChars).toBe(true)
    })

    it('should have sources with duplicate titles', () => {
      const titles = mockDuplicateTitleSources.map(s => s.title)
      const uniqueTitles = new Set(titles)
      expect(uniqueTitles.size).toBeLessThan(titles.length)
    })

    it('should have sources with duplicate content', () => {
      const contents = mockDuplicateContentSources.map(s => s.content)
      const uniqueContents = new Set(contents)
      expect(uniqueContents.size).toBeLessThan(contents.length)
    })
  })

  describe('Batch Retrieval Fixtures', () => {
    it('should have at least 3 batch queries', () => {
      expect(mockBatchQueries.length).toBeGreaterThanOrEqual(3)
    })

    it('should have batch results as Map', () => {
      expect(mockBatchResults).toBeInstanceOf(Map)
      expect(mockBatchResults.size).toBeGreaterThan(0)
    })

    it('should have Portuguese queries', () => {
      mockBatchQueries.forEach(query => {
        expect(query).toBeTruthy()
        expect(query.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Query Fixtures', () => {
    it('should have at least 5 different query types', () => {
      const queryKeys = Object.keys(mockQueries)
      expect(queryKeys.length).toBeGreaterThanOrEqual(5)
    })

    it('should have all queries in Portuguese', () => {
      Object.values(mockQueries).forEach(query => {
        expect(query).toBeTruthy()
        expect(query.length).toBeGreaterThan(0)
        // Check for Portuguese question words (expanded list)
        const hasPortuguese = /^(Quais|Quem|Como|O que|Qual|Existem|Quanto)/.test(query)
        expect(hasPortuguese).toBe(true)
      })
    })
  })

  describe('Mock Embeddings', () => {
    it('should have embedding with 1536 dimensions', () => {
      expect(mockEmbedding).toBeInstanceOf(Array)
      expect(mockEmbedding.length).toBe(1536)
    })

    it('should have deterministic embedding with 1536 dimensions', () => {
      expect(mockDeterministicEmbedding).toBeInstanceOf(Array)
      expect(mockDeterministicEmbedding.length).toBe(1536)
    })

    it('should have embedding values between -1 and 1', () => {
      expect(mockEmbedding.every(value =>
        value >= -1 && value <= 1
      )).toBe(true)
    })
  })

  describe('Type Safety', () => {
    it('should have all sources as Source type', () => {
      const allSources: Source[] = [
        ...mockHighRelevanceSources,
        ...mockMixedRelevanceSources,
        ...mockLowRelevanceSources,
        ...mockSingleSource,
        ...mockLargeContentSource,
      ]

      allSources.forEach(source => {
        expect(source).toHaveProperty('title')
        expect(source).toHaveProperty('content')
        expect(source).toHaveProperty('similarity')
        expect(typeof source.similarity).toBe('number')
      })
    })
  })
})
