/**
 * Test fixtures for RAG (Retrieval Augmented Generation) testing
 *
 * This file provides reusable mock data and utilities for testing RAG pipeline functions.
 * All fixtures include realistic Portuguese content relevant to SOFIA domain.
 */

import { vi } from 'vitest'
import type { Source } from '@/types'

// ============================================================================
// LOGGER MOCK PATTERN (REQUIRED FOR ALL TEST FILES)
// ============================================================================
/**
 * Logger Mock Pattern
 *
 * CRITICAL: Add this mock at the TOP of every test file to suppress console output
 * during test execution. This prevents test pollution and keeps test output clean.
 *
 * Usage:
 * ```typescript
 * vi.mock('@/lib/logger', () => ({
 *   logger: {
 *     debug: vi.fn(),
 *     info: vi.fn(),
 *     warn: vi.fn(),
 *     error: vi.fn(),
 *   },
 * }))
 * ```
 *
 * If you need to assert on logger calls in a specific test:
 * ```typescript
 * import { logger } from '@/lib/logger'
 *
 * it('should log error when RPC fails', async () => {
 *   // ... test code ...
 *   expect(logger.error).toHaveBeenCalledWith(
 *     '[SUPABASE RPC ERROR]:',
 *     expect.any(Object)
 *   )
 * })
 * ```
 */
/**
 * Factory para criar logger mock fresco para cada teste
 * Evita compartilhamento de estado entre testes
 */
export function createLoggerMockPattern() {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
}

// ============================================================================
// MOCK SOURCES WITH VARYING SIMILARITY SCORES
// ============================================================================

/**
 * High relevance sources (similarity >= 0.8)
 * Use for testing optimal retrieval scenarios
 */
export const mockHighRelevanceSources: Source[] = [
  {
    title: 'Lei nº 11.440/2006',
    content: 'Dispõe sobre o cargo de Oficial de Chancelaria e dá outras providências. Art. 1º O cargo de Oficial de Chancelaria do Serviço Exterior Brasileiro éaquele a que se refere o art. 3º da Lei nº 7.501, de 17 de junho de 1986.',
    similarity: 0.95,
  },
  {
    title: 'Decreto nº 8.927/2016',
    content: 'Regulamenta a Lei nº 11.440, de 29 de dezembro de 2006, que dispõe sobre o cargo de Oficial de Chancelaria. Parágrafo único. O Oficial de Chancelaria é o diplomata de carreira do Serviço Exterior Brasileiro.',
    similarity: 0.88,
  },
  {
    title: 'Portaria MRE nº 1.234/2020',
    content: 'Estabelece normas para a lotação e remoção de Oficiais de Chancelaria. Art. 2º A lotação de Oficiais de Chancelaria nas unidades do Serviço Exterior Brasileiro observará os critérios de antiguidade e merecimento.',
    similarity: 0.85,
  },
  {
    title: 'Resolução CD/ANCE nº 15/2019',
    content: 'Dispõe sobre o estágio probatório dos Oficiais de Chancelaria. Art. 3º O estágio probatório terá duração de 3 (três) anos e será avaliado anualmente.',
    similarity: 0.82,
  },
  {
    title: 'Instrução Normativa DGM nº 42/2021',
    content: 'Orienta sobre a aplicação da Lei nº 11.440/2006 no que tange aos direitos e deveres dos Oficiais de Chancelaria. Parágrafo único. Constitui dever do Oficial de Chancelaria o zelo pelo bom nome do Serviço Exterior Brasileiro.',
    similarity: 0.80,
  },
]

/**
 * Mixed relevance sources (varying similarity scores)
 * Use for testing threshold filtering and ranking
 */
export const mockMixedRelevanceSources: Source[] = [
  {
    title: 'Lei nº 11.440/2006',
    content: 'Dispõe sobre o cargo de Oficial de Chancelaria. Art. 57. A remoção de Oficial de Chancelaria será solicitada ao Presidente da República pelo Ministro de Estado das Relações Exteriores.',
    similarity: 0.92,
  },
  {
    title: 'Decreto nº 5.789/2006',
    content: 'Promulga a Convenção de Viena sobre Relações Consulares. Art. 5º As funções consulares serão exercidas pelas missões consulares.',
    similarity: 0.65,
  },
  {
    title: 'Lei nº 8.112/1990',
    content: 'Dispõe sobre o regime jurídico dos servidores públicos civis da União. Art. 3º Servidor público é a pessoa legalmente investida em cargo público.',
    similarity: 0.58,
  },
  {
    title: 'Constituição Federal',
    content: 'Art. 84. Compete privativamente ao Presidente da Nomear e exonerar os Ministros de Estado.',
    similarity: 0.52,
  },
  {
    title: 'Resolução CD/ANCE nº 8/2015',
    content: 'Dispõe sobre o código de ética dos Oficiais de Chancelaria. Art. 1º O Oficial de Chancelaria deve pautar sua conduta pelos princípios da moralidade e impessoalidade.',
    similarity: 0.48, // Below threshold
  },
]

/**
 * Low relevance sources (similarity < 0.5)
 * Use for testing threshold filtering
 */
export const mockLowRelevanceSources: Source[] = [
  {
    title: 'Lei nº 9.609/1998',
    content: 'Dispõe sobre a proteção da propriedade intelectual de programa de computador.',
    similarity: 0.42,
  },
  {
    title: 'Decreto nº 2.681/1912',
    content: 'Regula a responsabilidade civil das estradas de ferro.',
    similarity: 0.35,
  },
  {
    title: 'Lei nº 7.347/1985',
    content: 'Disciplina a ação civil pública de responsabilidade por danos causados ao meio-ambiente.',
    similarity: 0.28,
  },
]

// ============================================================================
// EDGE CASE FIXTURES
// ============================================================================

/**
 * Empty sources array
 * Use for testing graceful degradation with no context
 */
export const mockEmptySources: Source[] = []

/**
 * Single source
 * Use for testing minimal viable context scenarios
 */
export const mockSingleSource: Source[] = [
  {
    title: 'Lei nº 11.440/2006',
    content: 'Dispõe sobre o cargo de Oficial de Chancelaria. Art. 1º O cargo de Oficial de Chancelaria do Serviço Exterior Brasileiro é aquele a que se refere o art. 3º da Lei nº 7.501, de 17 de junho de 1986.',
    similarity: 0.95,
  },
]

/**
 * Large content source (simulating a long document chunk)
 * Use for testing prompt building with lengthy content
 */
export const mockLargeContentSource: Source[] = [
  {
    title: 'Decreto nº 8.927/2016 (Texto Completo)',
    content: `Regulamenta a Lei nº 11.440, de 29 de dezembro de 2006, que dispõe sobre o cargo de Oficial de Chancelaria.
    CAPÍTULO I - DAS DISPOSIÇÕES PRELIMINARES
    Art. 1º Este Decreto regulamenta a Lei nº 11.440, de 29 de dezembro de 2006, que dispõe sobre o cargo de Oficial de Chancelaria do Serviço Exterior Brasileiro.
    Art. 2º O Oficial de Chancelaria é o diplomata de carreira do Serviço Exterior Brasileiro, integrante da carreira de que trata o art. 3º da Lei nº 7.501, de 17 de junho de 1986.
    Art. 3º Ao Oficial de Chancelaria incumbe o exercício de atividades típicas de diplomata de carreira, inclusive a substituição do Chefe da Missão Diplomática ou da Repartição Consular, quando designado.
    CAPÍTULO II - DA CARREIRA
    Art. 4º A carreira de Oficial de Chancelaria é estruturada em quatro classes, na seguinte ordem hierárquica:
    I - Terceiro Secretário;
    II - Segundo Secretário;
    III - Primeiro Secretário; e
    IV - Conselheiro.
    Art. 5º O ingresso na carreira de Oficial de Chancelaria dar-se-á no cargo de Terceiro Secretário, mediante concurso público de provas e títulos, de âmbito nacional, de acordo com o disposto na Lei nº 11.440, de 2006.
    Parágrafo único. O concurso público será realizado periodicamente, conforme dispuser edital publicado pelo Ministério das Relações Exteriores.
    Art. 6º O desenvolvimento na carreira dar-se-á por merecimento ou por antiguidade, nos termos da legislação aplicável.
    CAPÍTULO III - DOS DIREITOS E DEVERES
    Art. 7º São direitos do Oficial de Chancelaria, além dos previstos em lei:
    I - participar de cursos de treinamento e especialização;
    II - concorrer a remoção e promoção;
    III - obter licença para capacitação profissional; e
    IV - exercer funções comissionadas.
    Art. 8º São deveres do Oficial de Chancelaria:
    I - observar as normas legais e regulamentares;
    II - cumprir as ordens superiores;
    III - zelar pelo bom nome do Serviço Exterior Brasileiro;
    IV - guardar sigilo sobre assuntos de serviço;
    V - residir na sua sede de lotação, salvo autorização em contrário;
    VI - apresentar-se com pontualidade ao serviço; e
    VII - dedicar-se assídua e inteiramente ao exercício das suas atribuições.`,
    similarity: 0.90,
  },
]

/**
 * Sources with special characters
 * Use for testing markdown rendering and encoding
 */
export const mockSpecialCharactersSources: Source[] = [
  {
    title: 'Lei nº 12.527/2011 (Lei de Acesso à Informação)',
    content: 'Regula o acesso a informações previsto no inciso XXXIII do art. 5º, no inciso II do § 3º do art. 37 e no § 2º do art. 216 da Constituição Federal.',
    similarity: 0.75,
  },
  {
    title: 'Medida Provisória nº 905/2019',
    content: 'Estabelece o regime trabalhista para as pessoas jurídicas de direito público e as pessoas jurídicas de direito privado da administração pública direta, autárquica e fundacional.',
    similarity: 0.68,
  },
  {
    title: 'Resolução CD/ANCE nº 1-A/2002',
    content: 'Dispõe sobre o código de ética: § 1º - O "dever ético" é aquele que se impõe ao Oficial de Chancelaria em razão da sua função pública. § 2º - A "violação ética" ocorre quando há transgressão aos princípios da moralidade e impessoalidade.',
    similarity: 0.55,
  },
]

/**
 * Sources with duplicate titles
 * Use for testing deduplication logic
 */
export const mockDuplicateTitleSources: Source[] = [
  {
    title: 'Lei nº 11.440/2006',
    content: 'Dispõe sobre o cargo de Oficial de Chancelaria. Art. 1º O cargo de Oficial de Chancelaria do Serviço Exterior Brasileiro.',
    similarity: 0.95,
  },
  {
    title: 'Lei nº 11.440/2006',
    content: 'Art. 57. A remoção de Oficial de Chancelaria será solicitada ao Presidente da República pelo Ministro de Estado das Relações Exteriores.',
    similarity: 0.88,
  },
  {
    title: 'Decreto nº 8.927/2016',
    content: 'Regulamenta a Lei nº 11.440, de 29 de dezembro de 2006.',
    similarity: 0.82,
  },
  {
    title: 'Decreto nº 8.927/2016',
    content: 'Parágrafo único. O Oficial de Chancelaria é o diplomata de carreira do Serviço Exterior Brasileiro.',
    similarity: 0.78,
  },
]

/**
 * Sources with duplicate content
 * Use for testing content-based deduplication
 */
export const mockDuplicateContentSources: Source[] = [
  {
    title: 'Lei nº 11.440/2006',
    content: 'Dispõe sobre o cargo de Oficial de Chancelaria.',
    similarity: 0.95,
  },
  {
    title: 'Decreto nº 8.927/2016',
    content: 'Dispõe sobre o cargo de Oficial de Chancelaria.',
    similarity: 0.85,
  },
  {
    title: 'Resumo Lei 11.440',
    content: 'Dispõe sobre o cargo de Oficial de Chancelaria.',
    similarity: 0.75,
  },
]

// ============================================================================
// BATCH RETRIEVAL FIXTURES
// ============================================================================

/**
 * Multiple queries for batch retrieval testing
 */
export const mockBatchQueries = [
  'Quais são os direitos dos Oficiais de Chancelaria?',
  'Como funciona o estágio probatório?',
  'O que é preciso para promoção na carreira?',
]

/**
 * Expected batch results mapping
 */
export const mockBatchResults = new Map<string, Source[]>([
  [
    'Quais são os direitos dos Oficiais de Chancelaria?',
    [
      {
        title: 'Decreto nº 8.927/2016',
        content: 'Art. 7º São direitos do Oficial de Chancelaria, além dos previstos em lei: I - participar de cursos de treinamento e especialização; II - concorrer a remoção e promoção.',
        similarity: 0.92,
      },
    ],
  ],
  [
    'Como funciona o estágio probatório?',
    [
      {
        title: 'Resolução CD/ANCE nº 15/2019',
        content: 'Dispõe sobre o estágio probatório dos Oficiais de Chancelaria. Art. 3º O estágio probatório terá duração de 3 (três) anos.',
        similarity: 0.88,
      },
    ],
  ],
  [
    'O que é preciso para promoção na carreira?',
    [
      {
        title: 'Decreto nº 8.927/2016',
        content: 'Art. 6º O desenvolvimento na carreira dar-se-á por merecimento ou por antiguidade, nos termos da legislação aplicável.',
        similarity: 0.85,
      },
    ],
  ],
])

// ============================================================================
// QUERY FIXTURES
// ============================================================================

/**
 * Sample queries in Portuguese for testing
 */
export const mockQueries = {
  careerRights: 'Quais são os direitos dos Oficiais de Chancelaria?',
  careerDuties: 'Quais são os deveres funcionais do Oficial de Chancelaria?',
  promotion: 'Como funciona a promoção na carreira de Oficial de Chancelaria?',
  probation: 'Quanto tempo dura o estágio probatório?',
  removal: 'Como funciona a remoção de Oficiais de Chancelaria?',
  diplomaticCareer: 'O que é o Serviço Exterior Brasileiro?',
  legalBasis: 'Qual é a lei que regula a carreira de Oficial de Chancelaria?',
  training: 'Existem cursos de treinamento para Oficiais de Chancelaria?',
}

// ============================================================================
// MOCK EMBEDDINGS
// ============================================================================

/**
 * Mock embedding vector (1536 dimensions for text-embedding-3-small)
 * Use this to avoid actual OpenAI API calls in tests
 */
export const mockEmbedding = Array.from({ length: 1536 }, (_, i) =>
  i % 2 === 0 ? 0.1 : -0.1
)

/**
 * Mock embedding for similarity calculations
 * This produces deterministic similarity scores when combined with mock data
 */
export const mockDeterministicEmbedding = Array.from({ length: 1536 }, (_, i) =>
  i % 2 === 0 ? 0.5 : -0.5
)
