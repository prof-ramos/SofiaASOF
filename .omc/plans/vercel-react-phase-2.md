# Vercel React Best Practices - Phase 2 Implementation Plan

**Project:** SOFIA (Next.js 16 RAG Chatbot)
**Date:** 2025-03-06
**Scope:** 5 validated optimizations ready for implementation
**Status:** CONSENSUS APPROVED (Planner + Architect + Critic)
**Revised:**
  - Architect review: Removed 2 invalid optimizations, refined 3
  - Critic finding: Item 5 (Textarea auto-resize) already implemented - SKIP

---

## Executive Summary

This plan focuses on **5 validated, high-impact optimizations** that can be completed in a single implementation session (~25-35 minutes total). These build upon the 5 optimizations already implemented (RPC fix, early OpenAI init, content-visibility, metrics API refactoring, rate limiting).

**Already Implemented (Phase 1):**
1. Fixed obsolete RPC: `match_documents` -> `sofia_match_documents`
2. Early OpenAI client initialization
3. `content-visibility` optimization in MessageList
4. Metrics API refactoring with object handlers
5. Rate limiting documented (in-memory pattern)

**Already Implemented (Found during Critic review):**
6. **Textarea auto-resize** - Uses `field-sizing-content` class in `/components/ui/textarea.tsx:10`

**Phase 2 Focus (5 items to implement):**
- Reduce unnecessary re-renders (targeted, not blanket)
- Production-ready logging
- Better error boundaries
- Code organization improvements

**Removed from plan after Architect review:**
- ~~CSS highlight.js lazy load~~ - CSS is not in JS bundle; current import is already optimal
- ~~Lucide icon tree-shaking~~ - Next.js 16 Turbopack handles this automatically; deep imports can worsen bundle size

---

## Priority Matrix

| Priority | Item | Files Affected | Effort | Impact |
|----------|------|----------------|--------|--------|
| P1 | 1. useCallback for handleReset only | 1 | 5 min | Fewer re-renders |
| P1 | 2. Remove production console.logs | 7 | 5 min | Cleaner bundle |
| P2 | 3. Add Error Boundary wrapper | 2 | 10 min | Better UX |
| P2 | 4. Memoize derived state | 1 | 5 min | Fewer re-renders |
| P2 | 5. Extract Header as Client Component | 2 | 10 min | Cleaner separation |

| Priority | Item | Status | Notes |
|----------|------|--------|-------|
| N/A | ~~Textarea auto-resize~~ | SKIP | Already implemented in `/components/ui/textarea.tsx:10` |

---

## P1 - Performance Optimizations

### 1. useCallback for handleReset Only

**Problem:** The `handleReset` function is recreated on every render, potentially causing unnecessary re-renders in child components.

**Current Code:**
```typescript
// components/chat/ChatInterface.tsx:32-41
const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault()
  if (!input.trim() || isLoading) return
  const text = input
  setInput('')
  await sendMessage({ text })
}

const handleSelectQuestion = async (question: string) => {
  if (isLoading) return
  await sendMessage({ text: question })
}

const handleReset = () => {
  setMessages([])
  setInput('')
}
```

**Solution:** Wrap ONLY `handleReset` with `useCallback`. Do NOT wrap `sendMessage`-dependent handlers since `sendMessage` from `useChat` is already stable.

**Implementation:**
```typescript
// components/chat/ChatInterface.tsx
import { useState, useCallback, type FormEvent, memo } from 'react'

export const ChatInterface = memo(function ChatInterface() {
  const transport = useMemo(
    () => new DefaultChatTransport(TRANSPORT_CONFIG),
    []
  )

  const { messages, sendMessage, status, setMessages, error, regenerate } = useChat({
    transport,
    onError: (err) => {
      console.error('[CHAT INTERFACE ERROR]:', err)
    },
  })

  const [input, setInput] = useState('')
  const isLoading = status === 'submitted' || status === 'streaming'

  // handleSubmit - NO useCallback needed (sendMessage is already stable)
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    const text = input
    setInput('')
    await sendMessage({ text })
  }

  // handleSelectQuestion - NO useCallback needed (sendMessage is already stable)
  const handleSelectQuestion = async (question: string) => {
    if (isLoading) return
    await sendMessage({ text: question })
  }

  // handleReset - useCallback IS appropriate (uses setMessages from useChat state)
  const handleReset = useCallback(() => {
    setMessages([])
    setInput('')
  }, [setMessages])

  // ... rest of component
})
```

**Acceptance Criteria:**
- [ ] Only `handleReset` uses `useCallback`
- [ ] No console errors or warnings
- [ ] Functionality unchanged
- [ ] Profile shows no unnecessary re-renders

---

### 2. Remove Production Console Logs

**Problem:** Console logs in production code increase bundle size and may leak sensitive information.

**Files affected:**
- `lib/rag.ts` (4 logs)
- `lib/metrics.ts` (6 logs)
- `components/chat/ChatInterface.tsx` (1 log)
- `app/api/chat/route.ts` (1 log)

**Solution:** Create a production-safe logger utility.

**Implementation:**

```typescript
// lib/logger.ts
const isDevelopment = process.env.NODE_ENV === 'development'

export const logger = {
  log: isDevelopment ? console.log : () => {},
  warn: isDevelopment ? console.warn : () => {},
  error: console.error, // Keep errors in production
  debug: isDevelopment ? console.debug : () => {},
}
```

**Replace in lib/rag.ts:**
```typescript
// lib/rag.ts
import { logger } from './logger'

// Replace all console.log with logger.log
// Replace console.error with logger.error

// Line 54:
logger.log(`[RAG PERFORMANCE]: Context retrieved in ${duration}ms`)

// Line 118:
logger.error('[RAG ERROR]: Context retrieval failed, proceeding without context:', error)
```

**Replace in lib/metrics.ts:**
```typescript
// lib/metrics.ts
import { logger } from './logger'

// Lines 122, 128, 142, 148, 161, 167, 181, 187, 208:
// Replace console.error with logger.error
```

**Replace in components/chat/ChatInterface.tsx:**
```typescript
// components/chat/ChatInterface.tsx
import { logger } from '@/lib/logger'

// Line 25:
onError: (err) => {
  logger.error('[CHAT INTERFACE ERROR]:', err)
}
```

**Acceptance Criteria:**
- [ ] Logger utility created
- [ ] All console.log/warn/debug replaced
- [ ] console.error preserved for critical errors
- [ ] Production build has no console.log statements

---

## P2 - Nice-to-Have Improvements

### 3. Add Error Boundary Wrapper

**Problem:** No error boundary to gracefully handle React rendering errors.

**Solution:** Add error boundary wrapper for the chat interface.

**Implementation:**

```typescript
// components/ErrorBoundary.tsx (NEW FILE)
'use client'

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error('[ErrorBoundary]:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center h-screen p-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold mb-2">Algo deu errado</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Por favor, recarregue a pagina para continuar.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-emerald-700 text-white rounded-md hover:bg-emerald-800"
            >
              Recarregar
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
```

**Update app/page.tsx:**
```typescript
// app/page.tsx
import { Suspense, lazy } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const ChatInterface = lazy(() =>
  import('@/components/chat/ChatInterface').then(mod => ({ default: mod.ChatInterface }))
)

export default function Home() {
  return (
    <ErrorBoundary>
      <Suspense fallback={/* existing fallback */}>
        <ChatInterface />
      </Suspense>
    </ErrorBoundary>
  )
}
```

**Acceptance Criteria:**
- [ ] ErrorBoundary component created
- [ ] Wrapped around Suspense in app/page.tsx
- [ ] Test error case works

---

### 4. Memoize Derived State

**Problem:** `getTextContent` function runs on every MessageItem render even though message content hasn't changed.

**Current Code:**
```typescript
// components/chat/MessageItem.tsx:25-30
function getTextContent(message: UIMessage): string {
  return message.parts
    .filter((p) => p.type === 'text')
    .map((p) => (p as { type: 'text'; text: string }).text)
    .join('')
}

export const MessageItem = memo(function MessageItem({ message }: MessageItemProps) {
  const text = getTextContent(message) // Runs every render
  // ...
})
```

**Solution:** Use `useMemo` for derived text content.

**Implementation:**
```typescript
// components/chat/MessageItem.tsx
import { memo, useMemo } from 'react'

export const MessageItem = memo(function MessageItem({ message }: MessageItemProps) {
  const text = useMemo(
    () => message.parts
      .filter((p) => p.type === 'text')
      .map((p) => (p as { type: 'text'; text: string }).text)
      .join(''),
    [message.parts]
  )

  // ... rest unchanged
})
```

**Acceptance Criteria:**
- [ ] text content uses useMemo
- [ ] Message rendering unchanged

---

### 5. ~~Optimize Textarea Auto-Resize (CSS-Only)~~

**Status: ALREADY IMPLEMENTED - SKIP**

The textarea auto-resize optimization was already implemented in the codebase:

```typescript
// components/ui/textarea.tsx:10
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 field-sizing-content",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
```

The `field-sizing-content` class (line 10) provides the same CSS `field-sizing: content` behavior that this optimization intended to add.

**No action required.**

---

### 6. Extract Header as Client Component (Optional)

**Problem:** The header is embedded in ChatInterface. For cleaner separation, we can extract it as a separate Client Component.

**Current Structure:**
```typescript
// components/chat/ChatInterface.tsx - header is inline
<header className="flex items-center justify-between px-4 py-3 border-b bg-card shadow-sm">
  {/* header content */}
</header>
```

**Solution:** Extract ENTIRE header as a Client Component (do NOT split between server and client).

**Option A - Keep current implementation (RECOMMENDED):**
The current header is fine as-is. No action needed.

**Option B - Extract as Client Component:**

```typescript
// components/chat/ChatHeader.tsx (NEW FILE)
'use client'

import { Scale, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ChatHeaderProps {
  showReset: boolean
  onReset: () => void
}

export function ChatHeader({ showReset, onReset }: ChatHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b bg-card shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-emerald-700 flex items-center justify-center">
          <Scale className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-foreground leading-tight">SOFIA</h1>
          <p className="text-xs text-muted-foreground leading-tight">
            Suporte Orientado as Funcoes e Interesses dos Associados · ASOF
          </p>
        </div>
      </div>

      {showReset && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="text-muted-foreground hover:text-foreground gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span className="text-xs">Nova conversa</span>
        </Button>
      )}
    </header>
  )
}
```

```typescript
// components/chat/ChatInterface.tsx
import { ChatHeader } from './ChatHeader'

export const ChatInterface = memo(function ChatInterface() {
  // ... existing code ...

  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatHeader showReset={messages.length > 0} onReset={handleReset} />
      {/* ... rest of component ... */}
    </div>
  )
})
```

**Acceptance Criteria (if implementing Option B):**
- [ ] ChatHeader created as Client Component with 'use client'
- [ ] ChatInterface updated to use ChatHeader
- [ ] Header displays correctly
- [ ] Reset button functionality preserved

---

## Implementation Order (Recommended)

**Single Session (~25-35 minutes):**

1. useCallback for handleReset only (5 min)
2. Remove production console.logs / create logger (10 min)
3. Memoize derived state in MessageItem (5 min)
4. Add Error Boundary (10 min)
5. Extract Header as Client Component (optional, 10 min)

**SKIPPED (Already implemented):**
- ~~Textarea auto-resize~~ - Already uses `field-sizing-content` class

---

## Verification Steps

After implementation, verify:

1. **Build Success:**
   ```bash
   npm run build
   ```
   No errors or warnings.

2. **Runtime Testing:**
   - Chat interface loads
   - Messages send and receive
   - Markdown renders correctly
   - Syntax highlighting works
   - Reset button functions
   - Textarea auto-grows with content (already implemented, verify it works)
   - Error boundary catches errors (test with purposeful error)

3. **Production Logs:**
   ```bash
   npm run build
   npm run start
   ```
   Check browser console - no console.log in production.

---

## Expected Impact Summary

| Optimization | Bundle Reduction | Performance Gain |
|--------------|------------------|------------------|
| useCallback (targeted) | 0KB | Fewer re-renders where measured |
| Console removal | -2KB | Cleaner bundle |
| Error Boundary | 0KB | Better UX on errors |
| Memoize derived state | 0KB | Fewer re-renders in MessageItem |
| Header extraction (optional) | 0KB | Cleaner code organization |
| **Total** | **-2KB** | **Targeted re-render reduction** |

**Note:** The primary benefits are cleaner code and targeted performance improvements rather than significant bundle size reduction. Textarea auto-resize was already implemented.

---

## Open Questions

1. Should we implement distributed rate limiting (Upstash Redis) for production scale?
   - Current in-memory rate limiting is sufficient for MVP
   - Can be deferred until actual scale requirements emerge

2. Should we add transition animations for smoother UX?
   - Already using `tw-animate-css` for some animations
   - Can be evaluated separately from performance optimizations

---

## Notes

- All changes are backward compatible
- No breaking changes to API
- No database migrations required
- All changes can be deployed independently
- Each optimization can be verified separately
- Item 5 (Header extraction) is optional for code organization only

**Architect Review Summary (2025-03-06):**
- Removed: CSS lazy load (incorrect bundle claim)
- Removed: Lucide tree-shaking (Next.js 16 handles this)
- Refined: useCallback only for handleReset, not sendMessage-dependent handlers
- Refined: Textarea uses CSS `field-sizing` instead of useEffect (no layout thrash)
- Refined: Header extraction optional; if done, extract ENTIRE header as Client Component

**Critic Review Summary (2025-03-06):**
- Finding: Item 5 (Textarea auto-resize) already implemented
- Evidence: `/components/ui/textarea.tsx:10` uses `field-sizing-content` class
- Action: Marked as SKIP - no implementation needed

**Sources:**
- [Vercel React Best Practices](https://vercel.com/docs/concepts/frontend-optimizations/react-optimizations)
- [Next.js 16 Documentation](https://nextjs.org/docs)
- [React 19 Documentation](https://react.dev)
- [CSS field-sizing: content](https://developer.chrome.com/blog/css-field-sizing)
