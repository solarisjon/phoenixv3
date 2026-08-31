'use client'

import { useState, useEffect } from 'react'
import AgentCard from '@/components/agents/AgentCard'
import Link from 'next/link'

interface Agent {
  id: string
  name: string
  description: string
  provider_name: string
  model: string
  cost_budget: number
  total_cost?: number
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAgents()
  }, [])

  const fetchAgents = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/agents')
      if (!res.ok) throw new Error('Failed to fetch agents')
      const data = await res.json()
      setAgents(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Agents</h1>
            <p className="mt-2 text-gray-600">Manage your AI agent instances</p>
          </div>
          <Link
            href="/agents/create"
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Create Agent
          </Link>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-center text-gray-600">Loading agents...</div>
        ) : agents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
            <p className="text-gray-600">No agents yet. Create one to get started.</p>
            <Link
              href="/agents/create"
              className="mt-4 inline-block text-blue-600 hover:text-blue-700"
            >
              Create your first agent →
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <AgentCard key={agent.id} {...agent} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
