<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-05 | Updated: 2026-03-05 -->

# components

## Purpose
React components directory organized by feature. Contains chat-specific components and reusable UI components built with shadcn/ui.

## Key Files

No files at root level - components are organized into subdirectories.

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `chat/` | Chat interface components (see `chat/AGENTS.md`) |
| `ui/` | shadcn/ui reusable components (see `ui/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- **Use 'use client' only when necessary** (e.g., when using hooks or browser APIs)
- **Memoization**: Use `React.memo()` to prevent unnecessary re-renders
- **Props**: Define TypeScript interfaces for all props
- **Styling**: Use Tailwind CSS utility classes

### Testing Requirements
- Test component rendering with React Testing Library
- Test user interactions (clicks, form submissions)
- Test memoization effectiveness

### Common Patterns
- Export components as named exports: `export const ComponentName = memo(...)`
- Use `cn()` utility from `@/lib/utils` for conditional classes
- Keep components focused and single-purpose
- Extract static JSX outside components when possible

## Dependencies

### Internal
- `@/lib/utils.ts` - Utility functions (cn, etc.)
- `@/types/index.ts` - Shared TypeScript types

### External
- `react` - Core React library
- `lucide-react` - Icon library
- `clsx` - Conditional class names
- `tailwind-merge` - Tailwind class merging

<!-- MANUAL: -->