<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-05 | Updated: 2026-03-05 -->

# validation

## Purpose
Runtime validation using Zod schemas for API requests and data structures. Ensures type safety and data integrity throughout the application.

## Key Files

| File | Description |
|------|-------------|
| `schemas.ts` | Zod schemas for chat requests and data transformations |
| `__tests__/schemas.test.ts` | Unit tests for validation logic |

## For AI Agents

### Working In This Directory
- **Zod Schemas**: Define runtime type validation
- **Transformations**: Use `.transform()` for data conversion
- **Error Handling**: Return formatted error messages for API responses
- **Type Inference**: Use `z.infer<>` to derive TypeScript types

### Testing Requirements
- Test valid inputs pass validation
- Test invalid inputs return proper errors
- Test transformations produce correct output
- Test edge cases (empty arrays, null values, etc.)

### Common Patterns
- Export schemas: `export const SchemaName = z.object({...})`
- Derive types: `type SchemaType = z.infer<typeof SchemaName>`
- Validate safely: `safeParse()` instead of `parse()` for API routes
- Format errors: Map Zod errors to user-friendly messages

## Key Schemas

### chatRequestSchema
Validates incoming chat messages from the client:
- `messages` - Array of message objects with role and content
- `message.role` - Must be 'user' or 'assistant'
- `message.parts` - Array of message parts (text, images, etc.)

### toUIMessages()
Transforms validated data into UI-compatible format:
- Converts to AI SDK's UIMessage format
- Ensures proper typing for frontend consumption

### safeValidateChatRequest()
Safe validation wrapper that:
- Returns `{ success: true, data }` on success
- Returns `{ success: false, error }` on failure
- Never throws - always returns a result object

## Dependencies

### Internal
- `@/types/index.ts` - Shared TypeScript types

### External
- `zod` - Runtime validation and type inference

<!-- MANUAL: -->