# Test Coverage Analysis — SOFIA ASOF

## Current State

The project uses **Vitest 4** with `@testing-library/react` but has minimal coverage.

| Metric | Value |
|--------|-------|
| Test files | 2 |
| Source files with any tests | 2 of ~30 meaningful source files |
| Lines of test code | ~79 |
| Lines of source code | ~2,282 |
| Test/source ratio | ~3.5% |
| CI/CD test automation | None |

### What is already tested

| File | Tests | Assessment |
|------|-------|------------|
| `lib/rag.ts` | `buildContextPrompt()` — empty sources, formatting | **Incomplete** — only the formatting helper is tested; `generateEmbedding`, `retrieveContext`, and `retrieveContextBatch` have zero coverage |
| `lib/validation/schemas.ts` | `safeValidateChatRequest()` — valid payload, missing `parts`, invalid role | **Mostly good** but missing edge cases (message/content length limits, image parts, `validateChatRequest` throwing, `toUIMessages` conversion) |

---

## Proposed Improvements (Priority Order)

---

### 1. `lib/rate-limit.ts` — Pure function, highest ROI

**Why:** `rateLimit()` is a self-contained, stateful function with no external dependencies. It enforces security-critical behaviour (20 req/min per IP). It is the easiest module to test and the bugs here are silent (wrong `remaining` count, stale entry cleanup).

**Missing test cases:**
- First request is allowed and `remaining` decrements correctly
- Request at the exact limit is denied (`isRateLimited: true`)
- Requests older than the window are evicted before the check (sliding window)
- `remaining` is never negative (clamped at 0)
- `reset` timestamp equals `windowStart + interval`
- Cleanup runs and removes stale identifiers when `storage.size > 1000`
- Two different identifiers do not interfere with each other

```ts
// lib/__tests__/rate-limit.test.ts  (sketch)
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rateLimit } from '../rate-limit'

describe('rateLimit', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('allows first request and returns correct remaining', () => {
    const result = rateLimit('user-1', { interval: 60_000, limit: 3 })
    expect(result.isRateLimited).toBe(false)
    expect(result.remaining).toBe(2)
  })

  it('blocks request when limit is reached', () => {
    const opts = { interval: 60_000, limit: 2 }
    rateLimit('user-2', opts)
    rateLimit('user-2', opts)
    const result = rateLimit('user-2', opts)
    expect(result.isRateLimited).toBe(true)
    expect(result.remaining).toBe(0)
  })

  it('resets after the window expires', () => {
    const opts = { interval: 60_000, limit: 1 }
    rateLimit('user-3', opts)
    vi.advanceTimersByTime(61_000)
    const result = rateLimit('user-3', opts)
    expect(result.isRateLimited).toBe(false)
  })
})
```

---

### 2. `lib/metrics.ts` — Token counting (pure functions, no I/O)

**Why:** `countTokens()` and `countMessagesTokens()` are pure functions that drive cost calculations throughout the system. A wrong token count silently produces wrong billing metrics. The tiktoken encoder can be tested without mocking.

**Missing test cases:**
- `countTokens('')` returns 0
- `countTokens('hello world')` returns a known positive integer
- Very long strings produce proportionally larger counts
- `countMessagesTokens([])` returns 2 (the conversation overhead constant)
- `countMessagesTokens([{ role: 'user', content: 'Hi' }])` returns `4 + countTokens('Hi') + countTokens('user') + 2`
- The overhead formula (4 per message + 2 total) matches OpenAI's documented counting

The async functions (`logMessageMetrics`, `getStats`, `getDashboard`, `getRecentSessions`, `checkRateLimit`) require a Supabase mock but their error-path branches (returning `null`/`[]` on DB error) are also worth testing.

```ts
// lib/__tests__/metrics.test.ts  (sketch)
import { describe, it, expect } from 'vitest'
import { countTokens, countMessagesTokens } from '../metrics'

describe('countTokens', () => {
  it('returns 0 for empty string', () => {
    expect(countTokens('')).toBe(0)
  })

  it('returns positive count for normal text', () => {
    expect(countTokens('Hello world')).toBeGreaterThan(0)
  })
})

describe('countMessagesTokens', () => {
  it('returns base overhead for empty array', () => {
    expect(countMessagesTokens([])).toBe(2)
  })

  it('adds 4 overhead tokens per message', () => {
    const single = countMessagesTokens([{ role: 'user', content: '' }])
    // 4 (msg overhead) + tokens('user') + tokens('') + 2 (conv overhead)
    expect(single).toBe(4 + countTokens('user') + 0 + 2)
  })
})
```

---

### 3. `lib/validation/schemas.ts` — Missing edge cases in existing tests

**Why:** The existing 3 tests only cover the happy path and two obvious failures. Several schema constraints are completely untested.

**Missing test cases:**
- Text part exceeding 10,000 characters is rejected
- Empty `messages` array is rejected (min 1)
- More than 50 messages is rejected (max 50)
- Message with more than 20 parts is rejected
- `image` part with a valid URL is accepted
- `image` part with a non-URL string is rejected
- `tool-call` and `tool-result` parts are accepted
- `validateChatRequest()` throws `ZodError` on invalid input (not just returns `false`)
- `toUIMessages()` preserves the array structure (length and order)

---

### 4. `lib/rag.ts` — `retrieveContext` and `retrieveContextBatch` (with mocks)

**Why:** These functions contain branching error-handling logic that is currently untested. The happy path, the Supabase error path, and the `retrieveContextBatch` deduplication logic all need coverage.

**Missing test cases:**

*`retrieveContext`*
- When `supabase.rpc` returns data, sources are mapped correctly (title from metadata, default `'Documento'` when missing)
- When `supabase.rpc` returns an error, returns `[]` (graceful degradation)
- When `generateEmbedding` throws, returns `[]`

*`retrieveContextBatch`*
- Duplicate queries map to the same deduplicated result set
- If one embedding fails (returns `null`), that query gets an empty result while others succeed
- Returned `Map` contains an entry for every input query

```ts
// extend lib/__tests__/rag.test.ts
import { retrieveContext } from '../rag'
import { supabase } from '@/lib/supabase'
import * as openaiModule from 'openai'

vi.mock('@/lib/supabase', ...)
vi.mock('openai', ...)

it('maps Supabase rows to Source objects', async () => {
  vi.mocked(supabase.rpc).mockResolvedValueOnce({
    data: [{ content: 'text', metadata: { title: 'My Doc' }, similarity: 0.9 }],
    error: null,
  })
  const sources = await retrieveContext('test query')
  expect(sources[0]).toEqual({ title: 'My Doc', content: 'text', similarity: 0.9 })
})

it('returns [] when Supabase returns an error', async () => {
  vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: { message: 'DB error' } })
  expect(await retrieveContext('query')).toEqual([])
})
```

---

### 5. `lib/metrics-middleware.ts` — Session management and IP hashing

**Why:** `getSessionId()` has a clear priority order (header → cookie → generated) that must work correctly for session continuity. `hashIP()` is security-sensitive (privacy). `createMetricsContext()` must initialise fields correctly.

**Missing test cases:**

*`getSessionId`*
- Returns header value when `x-session-id` is present
- Falls back to cookie `sofia_session` when header is absent
- Generates a new `sess_*` UUID when neither is present
- Header takes precedence over cookie when both are present

*`hashIP`*
- Returns a 32-character hex string
- Same input produces same output (deterministic)
- Different IPs produce different hashes

*`createMetricsContext`*
- Returns an object with `messageId` starting with `msg_`
- `startTime` is close to `Date.now()`
- `promptTokens`, `chunksRetrieved` start at 0
- `ragSources` starts as an empty array

---

### 6. React components — `ChatInput`, `MessageItem`, `WelcomeScreen`

**Why:** These are user-facing components with interactive behaviour (form submission, conditional rendering) that can break silently during refactors.

**Components to prioritise:**

| Component | Key interactions to test |
|-----------|--------------------------|
| `ChatInput` | Submit triggers `onSubmit`, textarea is cleared after submit, disabled state prevents submit |
| `MessageItem` | User messages render with different styling than assistant messages, markdown content is rendered |
| `WelcomeScreen` | Suggestion chips call `onSuggestionClick` with the correct text |
| `MessageList` | Renders correct number of `MessageItem`s, empty state renders nothing |

These tests use `@testing-library/react` (already installed):

```tsx
// components/chat/__tests__/ChatInput.test.tsx  (sketch)
import { render, screen, fireEvent } from '@testing-library/react'
import { ChatInput } from '../ChatInput'

it('calls onSubmit with message text', () => {
  const onSubmit = vi.fn()
  render(<ChatInput onSubmit={onSubmit} isLoading={false} />)
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Hello' } })
  fireEvent.submit(screen.getByRole('form'))
  expect(onSubmit).toHaveBeenCalledWith('Hello')
})

it('does not submit when loading', () => {
  const onSubmit = vi.fn()
  render(<ChatInput onSubmit={onSubmit} isLoading={true} />)
  fireEvent.submit(screen.getByRole('form'))
  expect(onSubmit).not.toHaveBeenCalled()
})
```

---

### 7. Infrastructure improvements

**Add a `test` script to `package.json`:**

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

**Add `@vitest/coverage-v8` for coverage reporting:**

```bash
pnpm add -D @vitest/coverage-v8
```

**Add coverage thresholds to `vitest.config.ts`:**

```ts
test: {
  coverage: {
    provider: 'v8',
    thresholds: { lines: 60, functions: 60 },
    exclude: ['scripts/**', 'supabase/**', 'components/ui/**'],
  }
}
```

**Add a GitHub Actions workflow** to run tests on every push/PR.

---

## Summary

| Priority | Module | Type | Effort |
|----------|--------|------|--------|
| 1 | `lib/rate-limit.ts` | Unit (pure, no mocks) | Low |
| 2 | `lib/metrics.ts` — token counters | Unit (pure, no mocks) | Low |
| 3 | `lib/validation/schemas.ts` — edge cases | Unit | Low |
| 4 | `lib/rag.ts` — `retrieveContext` / `retrieveContextBatch` | Unit (with mocks) | Medium |
| 5 | `lib/metrics-middleware.ts` | Unit (with mocks) | Medium |
| 6 | `components/chat/` — `ChatInput`, `MessageItem`, `WelcomeScreen` | Component | Medium |
| 7 | CI/CD + coverage tooling | Infrastructure | Low |

Starting with priorities 1–3 would raise coverage significantly with minimal setup because those modules are pure functions requiring no mocks.
