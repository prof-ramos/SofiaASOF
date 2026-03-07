# RAG Test Fixtures

Reusable test data and utilities for RAG (Retrieval Augmented Generation) pipeline testing.

## Files

- **`sources.ts`** - Main fixtures file with mock sources, queries, and embeddings
- **`sources.test.ts`** - Verification tests to ensure fixtures are properly structured

## Usage

### Importing Fixtures

```typescript
import {
  mockHighRelevanceSources,
  mockMixedRelevanceSources,
  mockQueries,
  loggerMockPattern
} from '@/lib/__tests__/fixtures/sources'
```

### Logger Mock Pattern (REQUIRED)

**CRITICAL:** Add this mock at the TOP of every test file to suppress console output:

```typescript
import { vi } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))
```

### Example Test Using Fixtures

```typescript
import { describe, it, expect } from 'vitest'
import { buildContextPrompt } from '../rag'
import { mockHighRelevanceSources } from './fixtures/sources'

describe('buildContextPrompt', () => {
  it('should format high relevance sources', () => {
    const prompt = buildContextPrompt(mockHighRelevanceSources)
    expect(prompt).toContain('CONTEXTO RECUPERADO')
    expect(prompt).toContain('Lei nº 11.440/2006')
  })
})
```

## Available Fixtures

### Source Collections

- **`mockHighRelevanceSources`** - 5 sources with similarity >= 0.8
- **`mockMixedRelevanceSources`** - 5 sources with varying similarity (0.48-0.92)
- **`mockLowRelevanceSources`** - 3 sources with similarity < 0.5
- **`mockEmptySources`** - Empty array for edge case testing
- **`mockSingleSource`** - Single source for minimal scenarios
- **`mockLargeContentSource`** - Source with >1000 chars for testing long content
- **`mockSpecialCharactersSources`** - Sources with Portuguese special chars (º,ª,§,°)
- **`mockDuplicateTitleSources`** - Sources with duplicate titles
- **`mockDuplicateContentSources`** - Sources with duplicate content

### Query Collections

- **`mockBatchQueries`** - 3 Portuguese queries for batch retrieval
- **`mockQueries`** - Object with 8 query types:
  - `careerRights` - "Quais são os direitos dos Oficiais de Chancelaria?"
  - `careerDuties` - "Quais são os deveres funcionais do Oficial de Chancelaria?"
  - `promotion` - "Como funciona a promoção na carreira de Oficial de Chancelaria?"
  - `probation` - "Quanto tempo dura o estágio probatório?"
  - `removal` - "Como funciona a remoção de Oficiais de Chancelaria?"
  - `diplomaticCareer` - "O que é o Serviço Exterior Brasileiro?"
  - `legalBasis` - "Qual é a lei que regula a carreira de Oficial de Chancelaria?"
  - `training` - "Existem cursos de treinamento para Oficiais de Chancelaria?"

### Batch Results

- **`mockBatchResults`** - Map<string, Source[]> with expected batch retrieval results

### Embeddings

- **`mockEmbedding`** - Random 1536-dimension vector (text-embedding-3-small size)
- **`mockDeterministicEmbedding`** - Deterministic 1536-dimension vector for testing

### Logger Mock

- **`loggerMockPattern`** - Exported logger mock object for reference

## Running Tests

```bash
# Run fixtures verification test
vitest lib/__tests__/fixtures/sources.test.ts

# Run all RAG tests
vitest lib/__tests__/rag.test.ts
```

## Acceptance Criteria

✅ Fixtures file created with 15+ different export scenarios
✅ Includes sources with Portuguese content realistic to SOFIA domain
✅ Includes edge case fixtures (empty, single, large content, special characters)
✅ Logger mock pattern documented and exported for reuse
✅ Verification test created to ensure all fixtures work correctly
