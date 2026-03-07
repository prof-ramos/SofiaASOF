# SOFIA RAG Pipeline Test Coverage Plan

**Plan ID:** rag-pipeline-test-coverage
**Created:** 2025-03-07
**Updated:** 2025-03-07 (Revised per Architect/Critic feedback)
**Priority:** A - Core RAG Pipeline Reliability
**Complexity:** MEDIUM-HIGH

---

## Context

The SOFIA ASOF chatbot has new optimization components in production that require comprehensive test coverage:

1. **lib/rag-rerank.ts** - Heuristic cross-encoder re-ranking system
2. **lib/context-optimizer.ts** - Dynamic context optimizer with token budgeting
3. **lib/rag.ts** - RAG retrieval with new threshold (0.7) and chunk count (8)
4. **Integration patterns** - Parallel RAG + graceful degradation

Current test infrastructure:
- Vitest 4.0.18 with jsdom environment
- Existing tests: `lib/__tests__/context-optimizer.test.ts`, `lib/validation/__tests__/schemas.test.ts`
- Mock patterns established for Supabase RPC and OpenAI

---

## Work Objectives

Create comprehensive test coverage for the RAG pipeline optimization components to ensure:

1. **Reliability** - All edge cases and error conditions are handled gracefully
2. **Correctness** - Re-ranking and context optimization produce expected results
3. **Performance** - Operations complete within acceptable timeframes
4. **Regression prevention** - Future changes don't break optimization behavior

---

## Guardrails

### Must Have
- Tests must use Vitest with existing mock patterns (Supabase, OpenAI)
- All tests must pass with `pnpm test`
- New test files must follow naming pattern: `__tests__/*.test.ts`
- Tests must be isolated (no shared state between tests)
- Mock fixtures in a dedicated test fixtures directory

### Must NOT Have
- No calls to real OpenAI API in tests
- No calls to real Supabase in tests
- No flaky tests (time-dependent, random order)
- No tests that require external dependencies (@xenova/transformers is optional)
- No modification to production code (only test files)

---

## Task Flow

```
Phase 1: Test Infrastructure Setup
    |
    v
Phase 2: Unit Tests - RAG Re-ranking
    |
    v
Phase 3: Unit Tests - Context Optimizer
    |
    v
Phase 4: Integration Tests - Full RAG Pipeline
    |
    v
Phase 5: Verification & Documentation
```

---

## Detailed TODOs

### Phase 1: Test Infrastructure Setup (1 file)

**File:** `lib/__tests__/fixtures/sources.ts`

Create reusable test fixtures for RAG testing:

```typescript
// Sample sources with varying similarity scores
export const mockSources = {
  highRelevance: [
    { title: 'Lei 11.440/2006', content: 'Dispõe sobre o cargo de Oficial de Chancelaria...', similarity: 0.95 },
    { title: 'Decreto 8.927/2016', content: 'Regulamenta a carreira de Oficial de Chancelaria...', similarity: 0.88 },
    // ... more sources
  ],
  mixedRelevance: [/* sources with varying similarity */],
  lowRelevance: [/* sources below 0.5 threshold */],
  // Edge cases: empty, single source, duplicate titles, etc.
}
```

**1.1 Logger Mock Pattern (HIGH PRIORITY)**

All test files must use the following logger mock pattern to suppress console output during tests:

```typescript
// Add at the top of each test file
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))
```

**Acceptance Criteria:**
- [ ] Fixtures file created with at least 5 different source scenarios
- [ ] Includes sources with Portuguese content (realistic to SOFIA domain)
- [ ] Includes edge case fixtures (empty, single, large content, special characters)
- [ ] Logger mock pattern documented in fixtures file for reuse

---

### Phase 2: Unit Tests - RAG Re-ranking (1 file)

**File:** `lib/__tests__/rag-rerank.test.ts`

Test coverage for `lib/rag-rerank.ts`:

**2.1 Core Functionality Tests**
- [ ] `rerankSourcesHeuristic()` returns sources sorted by rerankScore
- [ ] Keyword matching bonus is applied correctly
- [ ] Length penalties work for chunks <100 chars and >2000 chars
- [ ] First-word keyword bonus is applied correctly
- [ ] Scores are normalized to [0, 1] range

**2.2 Edge Case Tests**
- [ ] Empty sources array returns empty array
- [ ] Single source returns unchanged (no re-ranking needed)
- [ ] Two sources are correctly re-ordered by score
- [ ] Sources with identical content are handled
- [ ] Query with only stopwords (words <= 2 chars) still works

**2.3 Error Handling Tests**
- [ ] Heuristic re-ranking error falls back to original sources
- [ ] `rerankSources()` with <=1 source returns early without processing
- [ ] `rerankSources()` removes rerankScore/originalRank before returning

> **DO NOT test `rerankSourcesWithModel()` (lines 161-232 of rag-rerank.ts)** — This function intentionally throws an error as it is a deprecated placeholder for future model-based re-ranking. Testing this function is unnecessary as it is not used in the production code path and exists only to preserve the interface for future implementation.

**2.4 Performance Tests**
- [ ] Re-ranking 10 sources completes in <100ms
- [ ] Re-ranking 50 sources completes in <500ms

**Acceptance Criteria:**
- [ ] At least 15 test cases covering all branches
- [ ] All tests use mock fixtures from Phase 1
- [ ] No external dependencies required

---

### Phase 3: Unit Tests - Context Optimizer (1 file)

**File:** `lib/__tests__/context-optimizer.test.ts`

Test coverage for `lib/context-optimizer.ts`:

**3.1 Token Estimation Tests**
- [ ] `estimateTokens()` returns 0 for empty string
- [ ] `estimateTokens()` returns 0 for whitespace-only string
- [ ] `estimateTokens()` calculates correctly (~4 chars = 1 token)
- [ ] `estimateTokens()` normalizes whitespace before counting

**3.2 Dynamic Context Building Tests**
- [ ] `buildDynamicContextPrompt()` returns empty string for no sources
- [ ] Uses all sources when within token limit
- [ ] Applies top-N limit (maxChunks) even when under token limit
- [ ] Optimizes (reduces) sources when exceeding token limit
- [ ] Includes token estimates in context prompt when available

**3.3 Source Selection Tests**
- [ ] Maintains diversity (respects diversityThreshold per source hash)
- [ ] Always includes first (highest relevance) source
- [ ] Stops when maxTokens would be exceeded
- [ ] Respects minChunks even if tokens would be exceeded
- [ ] Respects maxChunks limit

**3.4 Integration Tests**
- [ ] `buildContextPromptSimple()` compatible with original function
- [ ] Custom options override defaults correctly
- [ ] Handles sources with missing/empty titles

**3.5 Edge Case Tests**
- [ ] Single large chunk exceeding token limit still included (minChunks=1)
- [ ] All chunks from same document handled by diversityThreshold
- [ ] Portuguese text with accents handled correctly in hashTitle()

**3.5.1 hashTitle() Fixtures for Portuguese (MEDIUM PRIORITY)**

Add specific test cases for Portuguese edge cases in hashTitle():

```typescript
describe('hashTitle() - Portuguese edge cases', () => {
  it('handles special characters: ç, ã, õ, é, á, í, ó, ú', () => {})
  it('normalizes accents before hashing', () => {})
  it('handles short titles (<5 chars)', () => {})
  it('filters words <=3 chars correctly in Portuguese', () => {})
  it('produces consistent hashes for same content', () => {})
})
```

**Acceptance Criteria:**
- [ ] At least 20 test cases covering all branches
- [ ] Logger calls are mocked (no console output in tests)
- [ ] Tests verify the optimization actually reduces token count

---

### Phase 4: Integration Tests - Full RAG Pipeline (1 file)

**File:** `lib/__tests__/rag-integration.test.ts`

End-to-end tests simulating the `/api/chat` RAG flow:

**4.1 RAG Retrieval Tests**
- [ ] `retrieveContext()` with threshold 0.7 filters low-similarity results
- [ ] `retrieveContext()` with matchCount 8 returns at most 8 results
- [ ] `retrieveContext()` RPC error returns empty array (graceful degradation)
- [ ] `retrieveContext()` OpenAI error throws (logged but propagates)

**4.2 Re-ranking Integration Tests**
- [ ] Flow: retrieveContext → rerankSources → verify reordering
- [ ] Re-ranking skipped when sources.length <= 1
- [ ] Re-ranking maintains all sources (no data loss)

**4.2.1 API Route Parameter Verification (HIGH PRIORITY)**

Add test cases verifying `/api/chat` passes correct parameters to RAG functions:

```typescript
describe('API Route Parameter Verification', () => {
  it('passes threshold=0.7 to retrieveContext()', async () => {
    // Mock Supabase RPC and verify threshold parameter
  })
  it('passes matchCount=8 to retrieveContext()', async () => {
    // Mock Supabase RPC and verify count parameter
  })
  it('calls rerankSources() when sources.length > 1', async () => {
    // Verify rerankSources is called with multiple sources
  })
  it('skips rerankSources() when sources.length <= 1', async () => {
    // Verify rerankSources is NOT called with single/empty source
  })
  it('passes correct options to buildDynamicContextPrompt()', async () => {
    // Verify maxChunks, maxContextTokens, etc. are passed correctly
  })
})
```

**4.3 Context Optimization Integration Tests**
- [ ] Flow: retrieveContext → rerankSources → buildDynamicContextPrompt
- [ ] Final context within maxContextTokens limit
- [ ] Final context respects maxChunks limit
- [ ] Final context maintains source diversity

**4.4 Error Handling Integration Tests**
- [ ] RAG failure + re-ranking = empty sources (graceful degradation)
- [ ] Re-ranking failure = continues with original sources
- [ ] Context optimizer with empty sources = empty string

**4.5 Batch Retrieval Tests (existing function)**
- [ ] `retrieveContextBatch()` handles multiple queries in parallel
- [ ] `retrieveContextBatch()` handles partial failures (some queries fail)
- [ ] `retrieveContextBatch()` deduplicates results from duplicate queries

**Acceptance Criteria:**
- [ ] At least 15 integration test cases
- [ ] All external dependencies mocked (Supabase RPC, OpenAI embeddings)
- [ ] Tests verify the complete pipeline works correctly

---

### Phase 5: Verification & Documentation

**5.1 Test Coverage Verification**
- [ ] Run `pnpm test` - all tests pass
- [ ] Check coverage for target files (aim for >80%)
- [ ] No console errors or warnings during test run

> **Performance Test Environment Notes (MEDIUM PRIORITY)**
>
> Performance tests in Phase 2.4 should:
> - Use `test.slow()` to mark these tests as slow-running
> - Be configured to run in CI-only (skip locally by default)
> - Allow 20% margin for timing assertions to account for CI variability
> - Example pattern:
> ```typescript
> test.slow('Re-ranking 10 sources completes in <100ms', () => {
>   // Use performance.mark() or expect().toBeLessThan()
> }, { skip: !process.env.CI })
> ```

**5.2 Documentation**
- [ ] Update CLAUDE.md with test running instructions if needed
- [ ] Document mock patterns in test files (comments)

**Acceptance Criteria:**
- [ ] All tests passing locally
- [ ] Coverage report generated and reviewed
- [ ] No new dependencies added

---

## Success Criteria

1. **Test Files Created:** 4 new test files + 1 fixtures file
2. **Test Cases:** 55+ test cases covering:
   - Unit tests for re-ranking (15+ cases)
   - Unit tests for context optimizer (20+ cases, including hashTitle Portuguese edge cases)
   - Integration tests for full pipeline (15+ cases, including API route parameter verification)
   - Logger mock pattern applied across all test files
3. **Coverage:** >80% coverage for rag-rerank.ts and context-optimizer.ts
4. **Reliability:** All tests pass consistently (no flaky tests)
5. **No Breaking Changes:** Production code remains untouched

---

## Open Questions

> **Note:** The question about testing the deprecated model-based re-ranking path has been resolved. See Phase 2.3 for the explicit decision: DO NOT test `rerankSourcesWithModel()`.

- [ ] Should we add performance regression tests with specific thresholds? — See Phase 5.1 for CI-only performance test pattern
- [ ] Should test fixtures include real Brazilian legal document excerpts? — Recommended for realism, but generic Portuguese content is acceptable

---

## Next Steps

Once this plan is approved:
1. Execute `/oh-my-claudecode:start-work rag-pipeline-test-coverage`
2. Tests will be implemented in phases 1-5 sequentially
3. Each phase will be verified before proceeding to the next

**Estimated Timeline:** 4-6 hours for full implementation (updated from 2-3 hours to account for 55+ test cases including API route parameter verification and Portuguese edge cases)
