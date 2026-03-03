'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { UIMessage } from 'ai'
import { Scale } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MessageItemProps {
  message: UIMessage
}

function getTextContent(message: UIMessage): string {
  return message.parts
    .filter((p) => p.type === 'text')
    .map((p) => (p as { type: 'text'; text: string }).text)
    .join('')
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === 'user'
  const text = getTextContent(message)

  if (!text) return null

  return (
    <div className={cn('flex gap-3 px-4 py-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <Avatar className="h-8 w-8 shrink-0 mt-0.5">
        {isUser ? (
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
            OC
          </AvatarFallback>
        ) : (
          <AvatarFallback className="bg-emerald-700 text-white text-xs">
            <Scale className="h-4 w-4" />
          </AvatarFallback>
        )}
      </Avatar>

      {/* Balão da mensagem */}
      <div className={cn('flex flex-col gap-1 max-w-[80%]', isUser ? 'items-end' : 'items-start')}>
        <span className="text-xs text-muted-foreground font-medium">
          {isUser ? 'Você' : 'SOFIA'}
        </span>

        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words',
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-sm whitespace-pre-wrap'
              : 'bg-muted text-foreground rounded-tl-sm'
          )}
        >
          {isUser ? (
            text
          ) : (
            <div className="prose-sm max-w-none [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_li]:mb-1 [&_p]:mb-2 last:[&_p]:mb-0 [&_strong]:font-semibold">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
