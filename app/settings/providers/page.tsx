'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface ProviderConfig {
  id: string
  type: 'claude-code' | 'openai-compat' | 'pi'
  name: string
  apiKey?: string
  endpoint?: string
  model?: string
}

export default function ProvidersSettingsPage() {
  const [providers, setProviders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<any>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  // In-memory only (never persisted) cache of API keys entered this session,
  // so re-testing a provider right after adding it doesn't require retyping the key.
  const [sessionKeys, setSessionKeys] = useState<Record<string, { apiKey: string; endpoint?: string; model?: string; type: string }>>({})

  const [formData, setFormData] = useState<ProviderConfig>({
    id: '',
    type: 'claude-code',
    name: '',
    apiKey: '',
    endpoint: '',
    model: '',
  })

  useEffect(() => {
    fetchProviders()
  }, [])

  const fetchProviders = async () => {
    try {
      const res = await fetch('/api/providers', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setProviders(data)
      }
    } catch (err) {
      console.error('Failed to fetch providers:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTest = async (providerId: string) => {
    setTesting(providerId)
    setTestResult(null)

    try {
      // Prefer whatever is live in the form; fall back to a key cached
      // earlier this session (e.g. from just saving this same provider).
      const cached = sessionKeys[providerId]
      const testType = formData.apiKey ? formData.type : cached?.type
      const testConfig = formData.apiKey
        ? {
            apiKey: formData.apiKey,
            endpoint: formData.endpoint,
            model: formData.model || 'claude-opus-5',
          }
        : cached
          ? {
              apiKey: cached.apiKey,
              endpoint: cached.endpoint,
              model: cached.model || 'claude-opus-5',
            }
          : null

      if (!testConfig) {
        setTestResult({
          success: false,
          message: 'Fill in the API key to test this provider',
        })
        setTesting(null)
        return
      }

      const res = await fetch('/api/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, type: testType, config: testConfig }),
      })

      const data = await res.json()
      setTestResult({
        success: res.ok,
        message: data.message || data.error,
        model: data.model,
      })
    } catch (err) {
      setTestResult({
        success: false,
        message: String(err),
      })
    } finally {
      setTesting(null)
    }
  }

  const handleDelete = async (providerId: string) => {
    if (!confirm('Delete this provider? This cannot be undone.')) return

    setDeleting(providerId)
    try {
      const res = await fetch(`/api/providers/${providerId}`, {
        method: 'DELETE',
      })
      const data = await res.json()

      if (res.ok) {
        setError(null)
        setSuccess('Provider deleted successfully')
        await fetchProviders()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(data.error || 'Failed to delete provider')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setDeleting(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const res = await fetch('/api/providers/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (res.ok) {
        // Cache the key in memory (this session only) against the real
        // provider id so "Test" on the saved card works without retyping.
        setSessionKeys((prev) => ({
          ...prev,
          [data.id]: {
            apiKey: formData.apiKey || '',
            endpoint: formData.endpoint,
            model: formData.model,
            type: formData.type,
          },
        }))
        setShowForm(false)
        setFormData({
          id: '',
          type: 'claude-code',
          name: '',
          apiKey: '',
          endpoint: '',
          model: '',
        })
        setError(null)
        await fetchProviders()
      } else {
        setError(data.error || 'Failed to save provider')
      }
    } catch (err) {
      setError(String(err))
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Loading providers...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/settings" className="mb-4 inline-block text-blue-600 hover:text-blue-700">
            ← Back to Settings
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Provider Configuration</h1>
          <p className="mt-2 text-gray-600">
            Configure AI providers (Claude Code, OpenAI, Pi, etc.) to enable agents to execute tasks
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-lg bg-green-50 p-4 text-sm text-green-800">
            {success}
          </div>
        )}

        {/* Providers List */}
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Configured Providers</h2>
            <button
              onClick={() => setShowForm(!showForm)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              {showForm ? 'Cancel' : '+ Add Provider'}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="mb-6 space-y-4 rounded-lg border border-blue-200 bg-blue-50 p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Provider Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="claude-code">Claude Code</option>
                  <option value="openai-compat">OpenAI Compatible</option>
                  <option value="pi">Pi</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., 'Claude on Laptop'"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">API Key</label>
                <input
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder="sk-... or your API key"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                  required
                />
              </div>

              {formData.type === 'openai-compat' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Endpoint URL</label>
                  <input
                    type="url"
                    value={formData.endpoint}
                    onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                    placeholder="https://api.example.com"
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                    required={formData.type === 'openai-compat'}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Model (Optional)</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="e.g., claude-opus-5, gpt-4"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleTest(formData.id || 'new')}
                  disabled={testing === (formData.id || 'new')}
                  className="flex-1 rounded-lg bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700 disabled:bg-gray-400"
                >
                  {testing === (formData.id || 'new') ? 'Testing...' : 'Test Connection'}
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                >
                  Save Provider
                </button>
              </div>

            </form>
          )}

          {testResult && (
            <div
              className={`mb-6 rounded-lg p-4 ${
                testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}
            >
              <p className="font-medium">
                {testResult.success ? '✅ Connection Successful' : '❌ Connection Failed'}
              </p>
              <p className="text-sm mt-1">{testResult.message}</p>
              {testResult.model && <p className="text-xs mt-1">Model: {testResult.model}</p>}
            </div>
          )}

          {providers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
              <p className="text-gray-600">No providers configured yet.</p>
              <p className="text-sm text-gray-500 mt-1">Add your first provider to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {providers.map((provider) => (
                <div key={provider.id} className="rounded-lg border border-gray-200 p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{provider.name}</h3>
                      <p className="text-sm text-gray-600 capitalize">{provider.type.replace('-', ' ')}</p>
                      {provider.model && <p className="text-xs text-gray-500 mt-1">Model: {provider.model}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleTest(provider.id)}
                        disabled={testing === provider.id}
                        className="rounded-lg bg-blue-100 px-3 py-1 text-sm text-blue-700 hover:bg-blue-200 disabled:bg-gray-200"
                      >
                        {testing === provider.id ? 'Testing...' : 'Test'}
                      </button>
                      <button
                        onClick={() => handleDelete(provider.id)}
                        disabled={deleting === provider.id}
                        className="rounded-lg bg-red-100 px-3 py-1 text-sm text-red-700 hover:bg-red-200 disabled:bg-gray-200"
                      >
                        {deleting === provider.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="font-semibold text-gray-900">About Providers</h3>
          <div className="mt-4 space-y-3 text-sm text-gray-600">
            <p>
              <strong>Claude Code:</strong> Use Anthropic&apos;s Claude API. Get your key at{' '}
              <code className="text-xs">console.anthropic.com</code>
            </p>
            <p>
              <strong>OpenAI Compatible:</strong> Any OpenAI-compatible endpoint (OpenAI, Azure, local LLMs).
              Provide the endpoint URL and API key.
            </p>
            <p>
              <strong>Pi:</strong> Coming soon. Configure your Pi API credentials.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
