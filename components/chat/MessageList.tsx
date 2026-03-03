'use client'

import { useEffect, useRef, memo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageItem } from './MessageItem'
import type { UIMessage } from 'ai'

interface MessageListProps {
  messages: UIMessage[]
  isLoading?: boolean
}

// Hoist static typing indicator JSX
const TYPING_INDICATOR = (
  <div className="flex gap-3 px-4 py-3">
    <div className="h-8 w-8 shrink-0 rounded-full bg-emerald-700 flex items-center justify-center">
      <span className="text-white text-xs">S</span>
    </div>
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground font-medium">SOFIA</span>
      <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          <span className="h-1.5 w-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  </div>
)

export const MessageList = memo(function MessageList({ messages, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  return (
    <ScrollArea className="flex-1 overflow-y-auto">
      <div className="flex flex-col py-2 min-h-full">
        {messages.map(message => (
          <MessageItem key={message.id} message={message} />
        ))}

        {/* Indicador de digitação */}
        {isLoading && TYPING_INDICATOR}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  )
})
