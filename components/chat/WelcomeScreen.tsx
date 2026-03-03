'use client'

import { Scale } from 'lucide-react'
import { memo } from 'react'

const SUGGESTED_QUESTIONS = [
  'Quais são os requisitos para promoção ao padrão seguinte?',
  'Como funciona o regime de remoção para postos no exterior?',
  'Quais benefícios o servidor recebe em exercício no exterior?',
  'O que diz a Lei nº 11.440/2006 sobre a carreira de Oficial de Chancelaria?',
  'Quais são as etapas do concurso público para Oficial de Chancelaria?',
  'Quais são os direitos previstos no RJU aplicáveis à carreira?',
] as const

// Hoist static JSX elements
const LOGO_ICON = (
  <div className="h-20 w-20 rounded-full bg-emerald-700 flex items-center justify-center shadow-lg">
    <Scale className="h-10 w-10 text-white" />
  </div>
)

const DISCLAIMER_TEXT = (
  <p className="text-xs text-muted-foreground max-w-sm">
    As respostas da SOFIA têm caráter informativo e não constituem parecer jurídico
    vinculante.
  </p>
)

interface WelcomeScreenProps {
  onSelectQuestion: (question: string) => void
}

export const WelcomeScreen = memo(function WelcomeScreen({ onSelectQuestion }: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-12 text-center gap-8">
      {/* Logo e título */}
      <div className="flex flex-col items-center gap-4">
        {LOGO_ICON}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">SOFIA</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium uppercase tracking-widest">
            ASOF · Serviço Exterior Brasileiro
          </p>
        </div>
        <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
          Sou a SOFIA, agente de inteligência artificial da ASOF. Estou aqui para orientar
          Oficiais de Chancelaria e candidatos sobre a carreira, legislação e procedimentos
          do Serviço Exterior Brasileiro.
        </p>
      </div>

      {/* Sugestões de perguntas */}
      <div className="w-full max-w-xl">
        <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wider">
          Perguntas frequentes
        </p>
        <div className="grid gap-2">
          {SUGGESTED_QUESTIONS.map((question, i) => (
            <button
              key={i}
              onClick={() => onSelectQuestion(question)}
              className="text-left px-4 py-3 text-sm rounded-xl border bg-card hover:bg-accent hover:border-emerald-300 transition-colors text-muted-foreground hover:text-foreground"
            >
              {question}
            </button>
          ))}
        </div>
      </div>

      {DISCLAIMER_TEXT}
    </div>
  )
})
