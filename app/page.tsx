import { Suspense, lazy } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const ChatInterface = lazy(() =>
  import('@/components/chat/ChatInterface').then(mod => ({ default: mod.ChatInterface }))
)

export default function Home() {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div
            className="flex items-center justify-center h-screen"
            role="status"
            aria-live="polite"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-700" />
              <p className="text-sm text-muted-foreground">Carregando SOFIA...</p>
            </div>
          </div>
        }
      >
        <ChatInterface />
      </Suspense>
    </ErrorBoundary>
  )
}
