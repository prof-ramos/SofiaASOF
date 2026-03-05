'use client'

import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'

interface MarkdownRendererProps {
  content: string
}

export const MarkdownRenderer = memo(function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose-sm max-w-none [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_li]:mb-1 [&_p]:mb-2 last:[&_p]:mb-0 [&_strong]:font-semibold">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          a: ({ href, children, ...props }) => {
            const isExternal = href?.startsWith('http://') || href?.startsWith('https://')
            return (
              <a
                href={href}
                {...props}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                className={isExternal ? 'text-emerald-600 hover:text-emerald-700 underline' : undefined}
              >
                {children}
              </a>
            )
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
})
