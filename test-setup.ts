/**
 * Setup global para testes
 * Configura mocks e variáveis de ambiente antes de carregar os módulos
 */

import { vi } from 'vitest'

// Configurar variáveis de ambiente ANTES de qualquer import
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.OPENAI_API_KEY = 'test-key'

// Criar mocks que podem ser exportados
export const mockRpc = vi.fn()
export const mockRpcAdmin = vi.fn()

// Mock do Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: mockRpc,
  },
  supabaseAdmin: {
    rpc: mockRpcAdmin,
  },
}))

// Mock do OpenAI
vi.mock('openai', () => {
  const mockCreate = vi.fn().mockResolvedValue({
    data: [{ embedding: Array.from({ length: 1536 }, () => 0.1) }]
  })
  return {
    default: class {
      embeddings = { create: mockCreate }
    }
  }
})

// Mock do logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))
