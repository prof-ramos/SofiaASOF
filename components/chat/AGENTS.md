<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-05 | Updated: 2026-03-05 -->

# chat

## Purpose
Chat interface components for SOFIA. Handles message display, user input, streaming responses, and welcome screen with suggested questions.

## Key Files

| File | Description |
|------|-------------|
| `ChatInterface.tsx` | Main chat container with useChat hook integration |
| `MessageList.tsx` | Scrollable message history container |
| `MessageItem.tsx` | Individual message component with memoization |
| `MarkdownRenderer.tsx` | Markdown renderer with syntax highlighting |
| `ChatInput.tsx` | Text input with send button and loading state |
| `WelcomeScreen.tsx` | Initial screen with suggested questions |

## For AI Agents

### Working In This Directory
- **All files use 'use client'** - These are Client Components
- **Memoization**: All components use `React.memo()` to prevent re-renders
- **Dynamic Imports**: MarkdownRenderer is lazy-loaded (~55KB saving)
- **Preloading**: Markdown libraries preload on hover/focus for perceived speed

### Testing Requirements
- Test message rendering for user and assistant roles
- Test streaming message updates
- Test markdown rendering with code blocks
- Test keyboard navigation and focus states

### Common Patterns
- Export as: `export const ComponentName = memo(function ComponentName(...) {...})`
- Use `cn()` utility for conditional classes
- Extract static JSX outside components (LOGO_ICON, DISCLAIMER_TEXT, etc.)
- Handle loading states gracefully

### Component Hierarchy
```
ChatInterface (root)
├── WelcomeScreen (when messages.length === 0)
├── MessageList (when messages.length > 0)
│   └── MessageItem (per message)
│       └── MarkdownRenderer (assistant messages only)
└── ChatInput (always visible)
```

## Dependencies

### Internal
- `@/lib/utils.ts` - cn() utility
- `@/components/ui/*` - Button, ScrollArea, Avatar, etc.

### External
- `@ai-sdk/react` - useChat() hook for streaming
- `ai` - UIMessage types
- `react-markdown` - Markdown rendering (lazy-loaded)
- `remark-gfm` - GitHub Flavored Markdown support
- `rehype-highlight` - Code syntax highlighting
- `highlight.js` - Syntax highlighting themes
- `lucide-react` - Icons (Scale, RotateCcw, etc.)

## Special Notes

### Message Flow
1. User types message → ChatInput
2. sendMessage() → useChat hook
3. Message added to messages array
4. Streaming response updates MessageItem
5. MarkdownRenderer renders formatted response

### Performance Optimizations
- MessageItem memoized to prevent re-render of all messages
- MarkdownRenderer lazy-loaded (55KB saving)
- Static JSX hoisted outside components
- Preload markdown on suggested question hover

<!-- MANUAL: -->
```