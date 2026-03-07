'use client'

import { Component, ReactNode } from 'react'
import { logger } from '@/lib/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    logger.error('[ErrorBoundary]:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center h-screen p-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold mb-2">Algo deu errado</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Por favor, recarregue a página para continuar.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-emerald-700 text-white rounded-md hover:bg-emerald-800"
            >
              Recarregar
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
