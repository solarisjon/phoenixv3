'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import AgentForm from '@/components/agents/AgentForm'
import Link from 'next/link'

export default function EditAgentPage() {
  const router = useRouter()
  const params = useParams()
  const agentId = params?.id as string
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [initialData, setInitialData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadAgent = async () => {
      try {
        const res = await fetch(`/api/agents/${agentId}`)
        if (!res.ok) throw new Error('Failed to load agent')
        const data = await res.json()
        setInitialData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load agent')
      } finally {
        setIsLoading(false)
      }
    }

    if (agentId) {
      loadAgent()
    }
  }, [agentId])

  const handleSubmit = async (formData: any) => {
    try {
      setIsSaving(true)
      setError(null)

      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update agent')
      }

      // Redirect to agents page after 2 seconds
      setTimeout(() => {
        router.push('/agents')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update agent')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center text-muted">Loading agent...</div>
        </div>
      </div>
    )
  }

  if (!initialData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="banner-error">
            Agent not found
          </div>
          <Link href="/agents" className="mt-4 inline-block text-primary hover:underline">
            ← Back to Agents
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/agents" className="mb-4 inline-block text-primary hover:underline">
          ← Back to Agents
        </Link>

        <h1 className="mb-2 text-3xl font-bold text-foreground">Edit Agent</h1>
        <p className="mb-8 text-muted">Update agent configuration</p>

        {error && (
          <div className="mb-6 banner-error">
            {error}
          </div>
        )}

        <AgentForm
          onSubmit={handleSubmit}
          isLoading={isSaving}
          initialData={initialData}
          isEditing
        />
      </div>
    </div>
  )
}
