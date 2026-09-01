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
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Agent Name
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="e.g., Python Expert"
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
          placeholder="What is this agent's expertise?"
          rows={3}
          disabled={isLoading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Provider
        </label>
        <select
          value={formData.providerId}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, providerId: e.target.value }))
          }
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
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
          <p className="mt-1 text-xs text-gray-600">{selectedProvider.description}</p>
        )}
      </div>

      {selectedProvider && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Model
          </label>
          {selectedProvider.availableModels.length > 0 ? (
            <select
              value={formData.model}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, model: e.target.value }))
              }
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
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
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="e.g., gpt-4o (no fixed model list for this provider type)"
              disabled={isLoading}
            />
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">
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
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="1000"
          disabled={isLoading}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-400"
      >
        {isLoading ? (isEditing ? 'Updating...' : 'Creating...') : isEditing ? 'Update Agent' : 'Create Agent'}
      </button>
    </form>
  )
}
