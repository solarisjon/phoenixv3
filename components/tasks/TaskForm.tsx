'use client'

import { useState, useEffect } from 'react'

interface Agent {
  id: string
  name: string
}

interface TaskFormData {
  name: string
  description: string
  agentId: string
  command: string
  scheduleCron: string
}

interface TaskFormProps {
  projectId: string
  onSubmit: (data: any) => Promise<void>
  isLoading?: boolean
  initialData?: Partial<TaskFormData>
  isEditing?: boolean
}

export default function TaskForm({
  projectId,
  onSubmit,
  isLoading = false,
  initialData,
  isEditing = false,
}: TaskFormProps) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [formData, setFormData] = useState<TaskFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    agentId: initialData?.agentId || '',
    command: initialData?.command || '',
    scheduleCron: initialData?.scheduleCron || '',
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
      if (!isEditing) {
        setFormData({
          name: '',
          description: '',
          agentId: '',
          command: '',
          scheduleCron: '',
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save task')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="banner-error">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-foreground">Task Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:ring-primary"
          placeholder="e.g., Run Analysis"
          disabled={isLoading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, description: e.target.value }))
          }
          className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:ring-primary"
          placeholder="What should this task do?"
          rows={3}
          disabled={isLoading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground">Agent</label>
        <select
          value={formData.agentId}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, agentId: e.target.value }))
          }
          className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:ring-primary"
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
        <label className="block text-sm font-medium text-foreground">
          Command (Optional)
        </label>
        <input
          type="text"
          value={formData.command}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, command: e.target.value }))
          }
          className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:ring-primary"
          placeholder="e.g., echo 'Hello World' > output.txt"
          disabled={isLoading}
        />
        <p className="mt-1 text-xs text-muted">
          Optional: shell command to execute. If omitted, agent reads task description
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground">
          Schedule (Optional)
        </label>
        <input
          type="text"
          value={formData.scheduleCron}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, scheduleCron: e.target.value }))
          }
          className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:ring-primary"
          placeholder="e.g., 7 12 17 (run at 7am, 12pm, 5pm daily)"
          disabled={isLoading}
        />
        <p className="mt-1 text-xs text-muted">
          Enter space-separated hours (0-23) or standard cron expression
        </p>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {isLoading
          ? isEditing
            ? 'Saving...'
            : 'Creating...'
          : isEditing
            ? 'Save Changes'
            : 'Create Task'}
      </button>
    </form>
  )
}
