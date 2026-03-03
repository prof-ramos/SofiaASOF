import { describe, it, expect } from 'vitest'
import { safeValidateChatRequest } from '../schemas'

describe('Validation Schemas', () => {
  it('deve aceitar um payload de chat válido', () => {
    const validPayload = {
      messages: [
        {
          id: '1',
          role: 'user',
          content: 'Olá',
          parts: [{ type: 'text', text: 'Olá' }],
        },
      ],
    }
    const result = safeValidateChatRequest(validPayload)
    expect(result.success).toBe(true)
  })

  it('deve rejeitar uma mensagem sem parts', () => {
    const invalidPayload = {
      messages: [
        {
          id: '1',
          role: 'user',
          content: 'Olá',
          // parts ausente
        },
      ],
    }
    const result = safeValidateChatRequest(invalidPayload)
    expect(result.success).toBe(false)
  })

  it('deve rejeitar um role inválido', () => {
    const invalidPayload = {
      messages: [
        {
          id: '1',
          role: 'system', // não permitido no schema do ChatRequest
          content: 'Olá',
          parts: [{ type: 'text', text: 'Olá' }],
        },
      ],
    }
    const result = safeValidateChatRequest(invalidPayload)
    expect(result.success).toBe(false)
  })
})
