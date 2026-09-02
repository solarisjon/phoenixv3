'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AgentForm from '@/components/agents/AgentForm'
import Link from 'next/link'

export default function CreateAgentPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (formData: any) => {
    try {
      setIsLoading(true)
      setError(null)

      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create agent')
      }

      const data = await res.json()
      setApiKey(data.apiKey)

      // Redirect to agents page after 3 seconds
      setTimeout(() => {
        router.push('/agents')
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent')
    } finally {
      setIsLoading(false)
    }
  }

  if (apiKey) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="panel-success p-8 text-center">
            <h2 className="text-2xl font-bold text-success">Agent Created!</h2>
            <p className="mt-2 text-success">
              Save your API key below. You won&apos;t be able to view it again.
            </p>

            <div className="mt-6 rounded-lg bg-surface p-4">
              <code className="break-all text-sm font-mono text-foreground">
                {apiKey}
              </code>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(apiKey)
              }}
              className="btn-success mt-4"
            >
              Copy to Clipboard
            </button>

            <p className="mt-6 text-sm text-muted">
              Redirecting to agents list in 3 seconds...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/agents" className="mb-6 inline-block text-primary hover:underline">
          ← Back to Agents
        </Link>

        <div>
          <h1 className="text-3xl font-bold text-foreground">Create Agent</h1>
          <p className="mt-2 text-muted">
            Create a new AI agent instance with a specific personality and expertise
          </p>
        </div>

        <div className="mt-8 rounded-lg bg-surface p-8 shadow-sm">
          <AgentForm onSubmit={handleSubmit} isLoading={isLoading} />
        </div>

        {error && (
          <div className="mt-4 banner-error">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
