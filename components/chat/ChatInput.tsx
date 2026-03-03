'use client'

import { type FormEvent, useRef, memo } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { SendHorizonal, Loader2 } from 'lucide-react'

interface ChatInputProps {
  input: string
  isLoading: boolean
  onInputChange: (value: string) => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
}

export const ChatInput = memo(function ChatInput({ input, isLoading, onInputChange, onSubmit }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Early exit for non-Enter keys
    if (e.key !== 'Enter' || e.shiftKey) return

    // Early exit if no input or loading
    if (!input.trim() || isLoading) return

    e.preventDefault()
    const form = textareaRef.current?.closest('form')
    form?.requestSubmit()
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2 p-4 border-t bg-background">
      <Textarea
        ref={textareaRef}
        value={input}
        onChange={e => onInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Digite sua dúvida sobre a carreira de Oficial de Chancelaria..."
        className="min-h-[48px] max-h-[160px] resize-none flex-1"
        disabled={isLoading}
        rows={1}
      />
      <Button
        type="submit"
        size="icon"
        disabled={isLoading || !input.trim()}
        className="h-12 w-12 shrink-0 bg-emerald-700 hover:bg-emerald-800"
        aria-label="Enviar mensagem"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <SendHorizonal className="h-4 w-4" />
        )}
      </Button>
    </form>
  )
})
