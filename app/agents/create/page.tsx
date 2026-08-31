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
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-green-200 bg-green-50 p-8 text-center">
            <h2 className="text-2xl font-bold text-green-900">Agent Created!</h2>
            <p className="mt-2 text-green-700">
              Save your API key below. You won&apos;t be able to view it again.
            </p>

            <div className="mt-6 rounded-lg bg-white p-4">
              <code className="break-all text-sm font-mono text-gray-900">
                {apiKey}
              </code>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(apiKey)
              }}
              className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            >
              Copy to Clipboard
            </button>

            <p className="mt-6 text-sm text-gray-600">
              Redirecting to agents list in 3 seconds...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/agents" className="mb-6 inline-block text-blue-600 hover:text-blue-700">
          ← Back to Agents
        </Link>

        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Agent</h1>
          <p className="mt-2 text-gray-600">
            Create a new AI agent instance with a specific personality and expertise
          </p>
        </div>

        <div className="mt-8 rounded-lg bg-white p-8 shadow-sm">
          <AgentForm onSubmit={handleSubmit} isLoading={isLoading} />
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
