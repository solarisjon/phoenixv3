'use client'

import React from 'react'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 p-8">
          <div className="mx-auto max-w-md text-center">
            <h1 className="text-2xl font-bold text-red-900">Something went wrong</h1>
            <p className="mt-2 text-red-700">{this.state.error?.message || 'An unexpected error occurred'}</p>

            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-6 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              Try again
            </button>

            <button
              onClick={() => (window.location.href = '/dashboard')}
              className="mt-3 block w-full rounded-lg bg-gray-200 px-4 py-2 text-gray-900 hover:bg-gray-300"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
