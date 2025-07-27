import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, Brain } from 'lucide-react'

/**
 * Konstel Error Boundary - Neural Fault Recovery System
 * 
 * This error boundary provides graceful error handling with the neural metaphor.
 * Rather than showing generic error messages, it presents errors as "neural
 * disruptions" and provides contextual recovery options that maintain the
 * brain-inspired interface theme.
 */

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Generate unique error ID for tracking
    const errorId = `neural-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    return {
      hasError: true,
      error,
      errorId
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Log error for debugging (in development)
    console.error('Konstel Neural Disruption:', error)
    console.error('Error Info:', errorInfo)
    
    // In production, you would send this to your error reporting service
    // this.reportErrorToService(error, errorInfo, this.state.errorId)
  }

  private handleRestart = () => {
    // Clear error state and attempt to recover
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    })
  }

  private handleReload = () => {
    // Full page reload to reset everything
    window.location.reload()
  }

  private handleReturnHome = () => {
    // Navigate back to home screen
    window.location.href = '/'
  }

  private getErrorSeverity(error: Error): 'minor' | 'moderate' | 'critical' {
    const errorMessage = error.message.toLowerCase()
    
    // Critical: Complete system failures
    if (errorMessage.includes('chunk') || errorMessage.includes('network') || errorMessage.includes('failed to fetch')) {
      return 'critical'
    }
    
    // Moderate: Component or data issues
    if (errorMessage.includes('render') || errorMessage.includes('data') || errorMessage.includes('api')) {
      return 'moderate'
    }
    
    // Minor: UI or interaction issues
    return 'minor'
  }

  private getErrorMetaphor(severity: 'minor' | 'moderate' | 'critical'): {
    title: string
    description: string
    icon: React.ComponentType<any>
    color: string
  } {
    switch (severity) {
      case 'critical':
        return {
          title: 'Neural Network Disconnection',
          description: 'The neural pathways have been severely disrupted. A full system restart is recommended.',
          icon: AlertTriangle,
          color: 'text-red-400'
        }
      case 'moderate':
        return {
          title: 'Synaptic Interference Detected',
          description: 'Some neural connections are experiencing interference. We can attempt to re-establish them.',
          icon: Brain,
          color: 'text-orange-400'
        }
      case 'minor':
        return {
          title: 'Minor Neural Fluctuation',
          description: 'A small disruption in the cognitive process. Normal function should resume shortly.',
          icon: RefreshCw,
          color: 'text-yellow-400'
        }
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      const severity = this.getErrorSeverity(this.state.error)
      const metaphor = this.getErrorMetaphor(severity)
      const Icon = metaphor.icon

      return (
        <div className="error-boundary h-screen flex items-center justify-center relative constellation-canvas">
          {/* Neural disruption background effect */}
          <div className="absolute inset-0 opacity-10">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="absolute w-px h-px bg-red-500 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animation: `pulse ${1 + Math.random() * 2}s ease-in-out infinite`,
                  animationDelay: `${Math.random() * 2}s`
                }}
              />
            ))}
          </div>

          <div className="relative z-10 max-w-2xl mx-auto text-center px-8">
            {/* Error icon with neural disruption effect */}
            <div className="relative mb-8">
              <Icon size={64} className={`${metaphor.color} mx-auto`} />
              
              {/* Disruption rings */}
              <div className="absolute inset-0 -m-8">
                <div className={`w-full h-full border ${metaphor.color.replace('text-', 'border-')}/30 rounded-full animate-ping`} />
              </div>
              <div className="absolute inset-0 -m-12">
                <div className={`w-full h-full border ${metaphor.color.replace('text-', 'border-')}/20 rounded-full animate-ping`} 
                     style={{ animationDelay: '0.5s' }} />
              </div>
            </div>

            {/* Error message */}
            <div className="mb-8">
              <h1 className="text-3xl font-light text-white mb-4">
                {metaphor.title}
              </h1>
              <p className="text-lg text-slate-300 mb-6">
                {metaphor.description}
              </p>
              
              {/* Error details (in development) */}
              {process.env.NODE_ENV === 'development' && (
                <details className="text-left bg-slate-800/50 rounded-lg p-4 mb-6 border border-slate-700/50">
                  <summary className="text-slate-400 cursor-pointer hover:text-white mb-2">
                    Technical Details (Development)
                  </summary>
                  <div className="text-xs font-mono text-slate-300 space-y-2">
                    <div>
                      <strong>Error ID:</strong> {this.state.errorId}
                    </div>
                    <div>
                      <strong>Message:</strong> {this.state.error.message}
                    </div>
                    <div>
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap mt-1 text-slate-400">
                        {this.state.error.stack}
                      </pre>
                    </div>
                    {this.state.errorInfo && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="whitespace-pre-wrap mt-1 text-slate-400">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>

            {/* Recovery actions */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={this.handleRestart}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white 
                           font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 
                           transition-all duration-300 flex items-center justify-center space-x-2 konstel-focus"
                >
                  <RefreshCw size={18} />
                  <span>Restart Neural Process</span>
                </button>
                
                {severity === 'critical' && (
                  <button
                    onClick={this.handleReload}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium 
                             rounded-lg transition-colors flex items-center justify-center space-x-2 konstel-focus"
                  >
                    <AlertTriangle size={18} />
                    <span>Full System Reset</span>
                  </button>
                )}
              </div>
              
              <button
                onClick={this.handleReturnHome}
                className="px-6 py-3 border border-slate-600 text-slate-300 font-medium rounded-lg
                         hover:border-slate-500 hover:text-white transition-colors flex items-center 
                         justify-center space-x-2 mx-auto konstel-focus"
              >
                <Home size={18} />
                <span>Return to Neural Hub</span>
              </button>
            </div>

            {/* Support information */}
            <div className="mt-8 text-sm text-slate-500">
              <p>
                If this neural disruption persists, the system may need recalibration.
              </p>
              {process.env.NODE_ENV === 'production' && (
                <p className="mt-2">
                  Error ID: <code className="font-mono bg-slate-800 px-2 py-1 rounded">
                    {this.state.errorId}
                  </code>
                </p>
              )}
            </div>
          </div>

          {/* Subtle error state background */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-red-900/10 to-orange-900/10" />
        </div>
      )
    }

    return this.props.children
  }
}

// Functional wrapper for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function BoundaryWrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}

// Hook for manual error reporting
export function useErrorHandler() {
  return (error: Error, errorInfo?: any) => {
    // Manually trigger error boundary
    throw error
  }
}
