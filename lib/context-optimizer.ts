/**
 * Otimização Dinâmica do Tamanho do Contexto RAG
 *
 * Objetivo: Reduzir custos de tokens mantendo qualidade das respostas
 * - Estima tokens dos chunks (≈4 chars = 1 token)
 * - Limita contexto dinamicamente (padrão: 2000 tokens)
 * - Seleciona chunks mais relevantes se exceder limite
 * - Mantém diversidade de fontes
 */

import { logger } from './logger'
import type { Source } from '@/types'

/**
 * Estimar quantidade de tokens em um texto
 * Regra geral: ~4 caracteres = 1 token para português
 */
export function estimateTokens(text: string): number {
  if (!text) return 0

  // Remove espaços extras e normaliza
  const normalized = text.replace(/\s+/g, ' ').trim()

  // Estimativa: 4 caracteres por token (conservador)
  return Math.ceil(normalized.length / 4)
}

/**
 * Estimar tokens do system prompt da SOFIA
 */
// Nota: SOFIA_SYSTEM_PROMPT_TOKENS removido para evitar import circular
// O system prompt tem aproximadamente ~2000 tokens
const SOFIA_SYSTEM_PROMPT_TOKENS = 2000

export interface ContextOptimizationOptions {
  maxContextTokens?: number    // Limite máximo de tokens para contexto (padrão: 2000)
  minChunks?: number           // Mínimo de chunks a manter (padrão: 3)
  maxChunks?: number           // Máximo de chunks (padrão: 5)
  diversityThreshold?: number  // Máximo de chunks do mesmo documento (padrão: 2)
}

/**
 * Construir prompt de contexto otimizado dinamicamente
 *
 * @param sources - Sources recuperadas pelo RAG (já reranked)
 * @param options - Opções de otimização
 * @returns String com contexto formatado ou string vazia
 */
export function buildDynamicContextPrompt(
  sources: Source[],
  options: ContextOptimizationOptions = {}
): string {
  if (sources.length === 0) return ''

  const {
    maxContextTokens = 2000,
    minChunks = 3,
    maxChunks = 5,
    diversityThreshold = 2
  } = options

  // Estimar tokens dos chunks
  const sourcesWithEstimates = sources.map(source => ({
    ...source,
    estimatedTokens: estimateTokens(source.content),
    title: source.title || 'Documento',
    sourceHash: hashTitle(source.title || 'Documento')
  }))

  // Calcular total se usarmos todos os chunks
  const totalEstimatedTokens = sourcesWithEstimates.reduce(
    (acc, s) => acc + s.estimatedTokens,
    0
  )

  // Se total estiver dentro do limite, usar todos (com ordenação de top N)
  if (totalEstimatedTokens <= maxContextTokens) {
    logger.log(`[CONTEXT OPTIMIZER]: Using all ${sources.length} sources (${totalEstimatedTokens} tokens)`)
    return buildContextPrompt(sourcesWithEstimates.slice(0, maxChunks))
  }

  // Se excedeu limite, aplicar otimizações
  logger.log(
    `[CONTEXT OPTIMIZER]: Context too large (${totalEstimatedTokens} tokens > ${maxContextTokens} limit), optimizing...`
  )

  // Estratégia 1: Selecionar chunks por relevância (já estão reranked)
  // Estratégia 2: Manter diversidade (não pegar muitos do mesmo doc)
  // Estratégia 3: Priorizar chunks mais informativos (tamanho médio)

  const selectedSources = selectOptimizedSources(
    sourcesWithEstimates,
    maxContextTokens,
    {
      minChunks,
      maxChunks,
      diversityThreshold
    }
  )

  const optimizedTokens = selectedSources.reduce(
    (acc, s) => acc + s.estimatedTokens,
    0
  )

  logger.log(
    `[CONTEXT OPTIMIZER]: Optimized to ${selectedSources.length} sources (${optimizedTokens} tokens, saved ${totalEstimatedTokens - optimizedTokens} tokens)`
  )

  return buildContextPrompt(selectedSources)
}

/**
 * Selecionar sources otimizadas baseado em múltiplos critérios
 */
function selectOptimizedSources(
  sources: Array<Source & { estimatedTokens: number; sourceHash: string }>,
  maxTokens: number,
  options: {
    minChunks: number
    maxChunks: number
    diversityThreshold: number
  }
): Array<Source & { estimatedTokens: number; sourceHash: string }> {
  const { minChunks, maxChunks, diversityThreshold } = options

  // Algoritmo de seleção:
  // 1. Pegar top minChunks (garante mínimo)
  // 2. Adicionar chunks gradualmente até:
  //    - Exceder maxTokens OU
  //    - Atingir maxChunks
  // 3. Manter diversidade (não pegar diversityThreshold do mesmo doc)

  const selected: typeof sources = []
  const sourceCountPerHash = new Map<string, number>()

  // Sempre pegar o primeiro (mais relevante)
  if (sources.length > 0) {
    selected.push(sources[0])
    sourceCountPerHash.set(sources[0].sourceHash, 1)
  }

  let currentTokens = selected.reduce((acc, s) => acc + s.estimatedTokens, 0)

  for (let i = 1; i < sources.length && selected.length < maxChunks; i++) {
    const candidate = sources[i]

    // Verificar se adicionar este chunk excederia limite de tokens
    if (currentTokens + candidate.estimatedTokens > maxTokens) {
      break
    }

    // Verificar diversidade (não pegar muitos do mesmo documento)
    const hash = candidate.sourceHash
    const count = sourceCountPerHash.get(hash) || 0

    if (count >= diversityThreshold) {
      // Pular este chunk para manter diversidade
      continue
    }

    // Adicionar chunk
    selected.push(candidate)
    sourceCountPerHash.set(hash, count + 1)
    currentTokens += candidate.estimatedTokens
  }

  return selected
}

/**
 * Hash simples do título para identificar documento fonte
 */
function hashTitle(title: string): string {
  // Hash simples baseado nas primeiras 3 palavras
  const words = title
    .toLowerCase()
    .replace(/[^\w\sà-ú]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3)
    .slice(0, 3)

  return words.join('-')
}

/**
 * Construir prompt de contexto (compatível com buildContextPrompt original)
 */
function buildContextPrompt(sources: Array<Source & { estimatedTokens?: number }>): string {
  if (sources.length === 0) return ''

  const blocks = sources
    .map((s, i) => {
      const tokenEstimate = s.estimatedTokens
        ? ` (~${s.estimatedTokens}t)`
        : ''
      return `[Fonte ${i + 1}${tokenEstimate}] ${s.title}\n${s.content}`
    })
    .join('\n\n---\n\n')

  return `\n\nCONTEXTO RECUPERADO DA BASE DE CONHECIMENTO:\n\n${blocks}\n\n---\n`
}

/**
 * Versão simplificada que mantém compatibilidade com buildContextPrompt original
 */
export function buildContextPromptSimple(sources: Source[]): string {
  if (sources.length === 0) return ''

  const blocks = sources
    .map((s, i) => `[Fonte ${i + 1}] ${s.title}\n${s.content}`)
    .join('\n\n---\n\n')

  return `\n\nCONTEXTO RECUPERADO DA BASE DE CONHECIMENTO:\n\n${blocks}\n\n---\n`
}
