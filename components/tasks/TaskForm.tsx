'use client'

import { useState, useEffect } from 'react'

interface Agent {
  id: string
  name: string
}

interface TaskFormProps {
  projectId: string
  onSubmit: (data: any) => Promise<void>
  isLoading?: boolean
}

export default function TaskForm({ projectId, onSubmit, isLoading = false }: TaskFormProps) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    agentId: '',
    scheduleCron: '',
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAgents()
  }, [])

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/agents')
      if (!res.ok) throw new Error('Failed to fetch agents')
      const data = await res.json()
      setAgents(data)
    } catch (err) {
      setError('Failed to load agents')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.name.trim()) {
      setError('Task name is required')
      return
    }

    if (!formData.agentId) {
      setError('Please select an agent')
      return
    }

    try {
      await onSubmit({ ...formData, projectId })
      setFormData({
        name: '',
        description: '',
        agentId: '',
        scheduleCron: '',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Task Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="e.g., Run Analysis"
          disabled={isLoading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, description: e.target.value }))
          }
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="What should this task do?"
          rows={3}
          disabled={isLoading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Agent</label>
        <select
          value={formData.agentId}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, agentId: e.target.value }))
          }
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
          disabled={isLoading}
        >
          <option value="">Select an agent</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Schedule (Optional)
        </label>
        <input
          type="text"
          value={formData.scheduleCron}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, scheduleCron: e.target.value }))
          }
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="e.g., 7 12 17 (run at 7am, 12pm, 5pm daily)"
          disabled={isLoading}
        />
        <p className="mt-1 text-xs text-gray-600">
          Enter space-separated hours (0-23) or standard cron expression
        </p>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-400"
      >
        {isLoading ? 'Creating...' : 'Create Task'}
      </button>
    </form>
  )
}
