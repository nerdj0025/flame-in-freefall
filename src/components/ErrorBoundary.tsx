import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface State {
  error: Error | null
}

// Catches a crash inside a page and shows the error instead of a blank screen.
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page crashed:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex min-h-screen items-center justify-center px-6 pt-24">
        <div className="glass w-full max-w-lg p-8 text-center" role="alert">
          <p className="mb-3 font-mono text-[10px] tracking-[0.25em] text-flame uppercase">Something broke</p>
          <h2 className="mb-3 text-xl font-bold">This page hit an error</h2>
          <p className="mb-6 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-left font-mono text-xs break-words text-muted">
            {this.state.error.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="cursor-pointer bg-flame px-6 py-3 font-mono text-[11px] font-bold tracking-[0.25em] text-space uppercase"
          >
            Reload
          </button>
        </div>
      </div>
    )
  }
}