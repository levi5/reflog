import { Component, type ReactNode } from "react"
import { ErrorFallback } from "../ErrorFallback"

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (args: { error: Error | null; reset: () => void }) => ReactNode
  onError?: (error: Error, info: { componentStack?: string }) => void
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    this.props.onError?.(error, info)
    try {
      console.error("[ErrorBoundary]", error, info.componentStack)
    } catch {
    }
  }

  private handleReset = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback({ error: this.state.error, reset: this.handleReset })
      return <ErrorFallback error={this.state.error} reset={this.handleReset} />
    }
    return this.props.children
  }
}
