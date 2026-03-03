'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useState, useMemo, type FormEvent } from 'react'
import { Separator } from '@/components/ui/separator'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { WelcomeScreen } from './WelcomeScreen'
import { Scale, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ChatInterface() {
  const transport = useMemo(() => new DefaultChatTransport({ api: '/api/chat' }), [])

  const { messages, sendMessage, status, setMessages, error, regenerate } = useChat({
    transport,
    onError: (err) => {
      console.error('[CHAT INTERFACE ERROR]:', err)
    },
  })

  const [input, setInput] = useState('')
  const isLoading = status === 'submitted' || status === 'streaming'

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    const text = input
    setInput('')
    await sendMessage({ text })
  }

  const handleSelectQuestion = async (question: string) => {
    if (isLoading) return
    await sendMessage({ text: question })
  }

  const handleReset = () => {
    setMessages([])
    setInput('')
  }

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
      {error && (
        <div className="px-4 py-3 bg-destructive/10 border-t border-destructive/20 flex items-center justify-between gap-4">
          <p className="text-sm text-destructive font-medium">
            Ocorreu um erro na conexão. Por favor, tente novamente.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => regenerate()}
            className="h-8 border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            Tentar novamente
          </Button>
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
}
