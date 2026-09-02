'use client'

import { useState, useEffect } from 'react'

interface Provider {
  id: string
  name: string
  type: string
  description: string
  availableModels: string[]
}

interface AgentFormProps {
  onSubmit: (data: any) => Promise<void>
  isLoading?: boolean
  initialData?: any
  isEditing?: boolean
}

export default function AgentForm({ onSubmit, isLoading = false, initialData, isEditing = false }: AgentFormProps) {
  const [providers, setProviders] = useState<Provider[]>([])
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    providerId: initialData?.providerId || '',
    model: initialData?.model || '',
    costBudget: initialData?.costBudget || 1000,
  })
  const [error, setError] = useState<string | null>(null)
  const [enhancing, setEnhancing] = useState(false)

  useEffect(() => {
    fetchProviders()
  }, [])

  useEffect(() => {
    if (formData.providerId) {
      const provider = providers.find((p) => p.id === formData.providerId)
      setSelectedProvider(provider || null)
      setFormData((prev) => ({ ...prev, model: '' }))
    }
  }, [formData.providerId, providers])

  const fetchProviders = async () => {
    try {
      const res = await fetch('/api/providers')
      if (!res.ok) throw new Error('Failed to fetch providers')
      const data = await res.json()
      setProviders(data)
    } catch (err) {
      setError('Failed to load providers')
      console.error(err)
    }
  }

  const handleEnhance = async () => {
    if (!formData.name.trim()) {
      setError('Enter an agent name first so the AI has something to work from')
      return
    }
    if (!formData.providerId) {
      setError('Select a provider first - it\'s what the enhancement call uses')
      return
    }

    setEnhancing(true)
    setError(null)
    try {
      const res = await fetch('/api/agents/enhance-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: formData.providerId,
          name: formData.name,
          draft: formData.description,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to enhance description')
      setFormData((prev) => ({ ...prev, description: data.description }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enhance description')
    } finally {
      setEnhancing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.name.trim()) {
      setError('Agent name is required')
      return
    }

    if (!formData.providerId) {
      setError('Please select a provider')
      return
    }

    if (!formData.model) {
      setError('Please select a model')
      return
    }

    try {
      await onSubmit(formData)
      // Reset form
      setFormData({
        name: '',
        description: '',
        providerId: '',
        model: '',
        costBudget: 1000,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent')
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
        <label className="block text-sm font-medium text-foreground">
          Agent Name
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:ring-primary"
          placeholder="e.g., Python Expert"
          disabled={isLoading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground">
          Provider
        </label>
        <select
          value={formData.providerId}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, providerId: e.target.value }))
          }
          className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:ring-primary"
          disabled={isLoading}
        >
          <option value="">Select a provider</option>
          {providers.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.name}
            </option>
          ))}
        </select>
        {selectedProvider && (
          <p className="mt-1 text-xs text-muted">{selectedProvider.description}</p>
        )}
      </div>

      {selectedProvider && (
        <div>
          <label className="block text-sm font-medium text-foreground">
            Model
          </label>
          {selectedProvider.availableModels.length > 0 ? (
            <select
              value={formData.model}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, model: e.target.value }))
              }
              className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:ring-primary"
              disabled={isLoading}
            >
              <option value="">Select a model</option>
              {selectedProvider.availableModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={formData.model}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, model: e.target.value }))
              }
              className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:ring-primary"
              placeholder="e.g., gpt-4o (no fixed model list for this provider type)"
              disabled={isLoading}
            />
          )}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-foreground">
            Description
          </label>
          <button
            type="button"
            onClick={handleEnhance}
            disabled={isLoading || enhancing || !formData.providerId}
            title={!formData.providerId ? 'Select a provider first' : undefined}
            className="text-xs font-medium text-primary hover:text-primary disabled:text-muted"
          >
            {enhancing ? 'Enhancing...' : '✨ Enhance with AI'}
          </button>
        </div>
        <textarea
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, description: e.target.value }))
          }
          className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:ring-primary"
          placeholder="What is this agent's expertise? Jot down a few notes, or leave blank and let AI draft from the name alone."
          rows={3}
          disabled={isLoading || enhancing}
        />
        <p className="mt-1 text-xs text-muted">
          This is sent verbatim as the agent&apos;s system prompt on every task.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground">
          Cost Budget (USD)
        </label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={formData.costBudget}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              costBudget: parseFloat(e.target.value),
            }))
          }
          className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:ring-primary"
          placeholder="1000"
          disabled={isLoading}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {isLoading ? (isEditing ? 'Updating...' : 'Creating...') : isEditing ? 'Update Agent' : 'Create Agent'}
      </button>
    </form>
  )
}
