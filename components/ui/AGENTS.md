<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-05 | Updated: 2026-03-05 -->

# ui

## Purpose
shadcn/ui component library - reusable, accessible UI components built with Radix UI primitives and Tailwind CSS.

## Key Files

| File | Description |
|------|-------------|
| `button.tsx` | Button component with variants |
| `input.tsx` | Text input with focus states |
| `textarea.tsx` | Multi-line text input for chat messages |
| `avatar.tsx` | User avatar with fallback support |
| `badge.tsx` | Small status/information badges |
| `scroll-area.tsx` | Custom scrollbar container |
| `separator.tsx` | Visual separator/divider |

## For AI Agents

### Working In This Directory
- **These are shadcn/ui components** - Don't modify without understanding patterns
- **Radix UI Primitives**: Underlying accessible components
- **Tailwind Variants**: Use `cva` (class-variance-authority) for variant styles
- **No barrel export**: Each file exports a single named component

### Testing Requirements
- Test keyboard navigation (Tab, Enter, Escape)
- Test screen reader accessibility
- Test variant combinations
- Test responsive behavior

### Common Patterns
- Components use class-variance-authority (cva) for variants
- Forward refs for DOM access
- Consistent className merging with cn()
- TypeScript with proper prop types

## Component Usage

### Button
```tsx
import { Button } from '@/components/ui/button'

<Button variant="default" size="sm">Click me</Button>
<Button variant="ghost" size="icon"><Icon /></Button>
```

### Avatar
```tsx
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

<Avatar>
  <AvatarFallback>AB</AvatarFallback>
</Avatar>
```

## Dependencies

### Internal
- `@/lib/utils.ts` - cn() utility for className merging

### External
- `@radix-ui/*` - Accessible component primitives
- `class-variance-authority` - Variant management
- `tailwind-merge` - Tailwind class deduplication
- `clsx` - Conditional classes

<!-- MANUAL: -->