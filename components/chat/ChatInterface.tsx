'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useState, useMemo, useCallback, type FormEvent, memo } from 'react'
import { Separator } from '@/components/ui/separator'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { WelcomeScreen } from './WelcomeScreen'
import { Scale, RotateCcw, AlertCircle, Clock, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/logger'

// Hoist static I/O - transport config constant at module scope
const TRANSPORT_CONFIG = {
  api: '/api/chat',
  timeout: 35000 // 35s (maior que maxDuration de 30s do servidor)
} as const

// Tipos de erro específicos
type ErrorType = 'network' | 'timeout' | 'rate_limit' | 'server' | 'unknown'

interface ErrorInfo {
  type: ErrorType
  message: string
  icon: React.ReactNode
  retryable: boolean
}

function getErrorInfo(err: Error & { cause?: unknown; name?: string; code?: string }): ErrorInfo {
  const errorMessage = err.message.toLowerCase()
  const errorName = err.name?.toLowerCase() || ''
  const errorCode = err.code?.toLowerCase() || ''

  // Timeout / Abort
  if (
    errorName.includes('abort') ||
    errorMessage.includes('abort') ||
    errorMessage.includes('timeout') ||
    errorCode.includes('timeout')
  ) {
    return {
      type: 'timeout',
      message: 'A requisição demorou muito para responder. O servidor pode estar sobrecarregado.',
      icon: <Clock className="h-4 w-4" />,
      retryable: true
    }
  }

  // Rate limit
  if (
    errorMessage.includes('rate limit') ||
    errorMessage.includes('limite') ||
    errorMessage.includes('429') ||
    err.cause && typeof err.cause === 'object' && 'status' in err.cause && err.cause.status === 429
  ) {
    return {
      type: 'rate_limit',
      message: 'Você excedeu o limite de requisições. Aguarde alguns momentos antes de tentar novamente.',
      icon: <AlertCircle className="h-4 w-4" />,
      retryable: false
    }
  }

  // Network error
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('econnrefused') ||
    errorMessage.includes('enotfound')
  ) {
    return {
      type: 'network',
      message: 'Erro de conexão com o servidor. Verifique sua internet e tente novamente.',
      icon: <RefreshCw className="h-4 w-4" />,
      retryable: true
    }
  }

  // Server error (5xx)
  if (
    errorMessage.includes('500') ||
    errorMessage.includes('502') ||
    errorMessage.includes('503') ||
    errorMessage.includes('504') ||
    err.cause && typeof err.cause === 'object' && 'status' in err.cause && typeof err.cause.status === 'number' && err.cause.status >= 500
  ) {
    return {
      type: 'server',
      message: 'Erro interno do servidor. Nossa equipe foi notificada e está trabalhando na correção.',
      icon: <AlertCircle className="h-4 w-4" />,
      retryable: true
    }
  }

  // Erro desconhecido
  return {
    type: 'unknown',
    message: 'Ocorreu um erro inesperado. Por favor, tente novamente.',
    icon: <AlertCircle className="h-4 w-4" />,
    retryable: true
  }
}

export const ChatInterface = memo(function ChatInterface() {
  const transport = useMemo(
    () => new DefaultChatTransport(TRANSPORT_CONFIG),
    [] // Empty deps - config is constant
  )

  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null)

  const { messages, sendMessage, status, setMessages, regenerate } = useChat({
    transport,
    onError: (err) => {
      logger.error('[CHAT INTERFACE ERROR]:', err)

      // Extrair informações do erro
      const errorInstance = err instanceof Error ? err : new Error(String(err))
      const info = getErrorInfo(errorInstance)
      setErrorInfo(info)

      // Log específico para debugging
      logger.error(`[CHAT ERROR - ${info.type.toUpperCase()}]:`, {
        message: errorInstance.message,
        name: errorInstance.name,
        cause: errorInstance.cause,
        stack: errorInstance.stack
      })
    },
  })

  // Limpar erro ao iniciar novo request
  const handleSendMessage = useCallback(async (text: string) => {
    setErrorInfo(null)
    await sendMessage({ text })
  }, [sendMessage])

  const [input, setInput] = useState('')
  const isLoading = status === 'submitted' || status === 'streaming'

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // Early exit if no input or loading
    if (!input.trim() || isLoading) return

    const text = input
    setInput('')
    await handleSendMessage(text)
  }

  const handleSelectQuestion = async (question: string) => {
    // Early exit if loading
    if (isLoading) return
    await handleSendMessage(question)
  }

  const handleReset = useCallback(() => {
    setMessages([])
    setInput('')
    setErrorInfo(null)
  }, [setMessages, setInput])

  const handleRetry = useCallback(async () => {
    if (!errorInfo?.retryable) return

    setErrorInfo(null)
    await regenerate()
  }, [errorInfo, regenerate])

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b bg-card shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-emerald-700 flex items-center justify-center">
            <Scale className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground leading-tight">SOFIA</h1>
            <p className="text-xs text-muted-foreground leading-tight">
              Suporte Orientado às Funções e Interesses dos Associados · ASOF
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-muted-foreground hover:text-foreground gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="text-xs">Nova conversa</span>
          </Button>
        )}
      </header>

      <Separator />

      {/* Área principal */}
      <main className="flex flex-col flex-1 overflow-hidden">
        {messages.length === 0 ? (
          <WelcomeScreen onSelectQuestion={handleSelectQuestion} />
        ) : (
          <MessageList messages={messages} isLoading={isLoading} />
        )}
      </main>

      {/* Erro e Retry */}
      {errorInfo && (
        <div className="px-4 py-3 bg-destructive/10 border-t border-destructive/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1">
            <div className="text-destructive">
              {errorInfo.icon}
            </div>
            <p className="text-sm text-destructive font-medium">
              {errorInfo.message}
            </p>
          </div>
          {errorInfo.retryable && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="h-8 border-destructive/30 text-destructive hover:bg-destructive/10 shrink-0"
            >
              Tentar novamente
            </Button>
          )}
        </div>
      )}

      {/* Input */}
      <ChatInput
        input={input}
        isLoading={isLoading}
        onInputChange={setInput}
        onSubmit={handleSubmit}
      />
    </div>
  )
})
