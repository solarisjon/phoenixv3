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
  binaryPath?: string
  thinking?: string
  tools?: string
  excludeTools?: string
  noTools?: boolean
}

export default function ProvidersSettingsPage() {
  const [providers, setProviders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<any>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  // In-memory only (never persisted) cache of API keys entered this session,
  // so re-testing a provider right after adding it doesn't require retyping the key.
  const [sessionKeys, setSessionKeys] = useState<Record<string, { apiKey?: string; endpoint?: string; model?: string; type: string; binaryPath?: string }>>({})

  const [formData, setFormData] = useState<ProviderConfig>({
    id: '',
    type: 'claude-code',
    name: '',
    apiKey: '',
    endpoint: '',
    model: '',
    binaryPath: '',
    thinking: '',
    tools: '',
    excludeTools: '',
    noTools: false,
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
      const testType = formData.apiKey || formData.type === 'pi' ? formData.type : cached?.type
      const testConfig = formData.type === 'pi'
        ? {
            apiKey: 'dummy',
            binaryPath: formData.binaryPath || cached?.binaryPath || 'pi',
            model: formData.model || '',
          }
        : formData.apiKey
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

  const handleEdit = async (providerId: string) => {
    try {
      const res = await fetch(`/api/providers/${providerId}`)
      const provider = await res.json()

      if (res.ok) {
        setFormData({
          id: provider.id,
          type: provider.type,
          name: provider.name,
          apiKey: provider.config?.apiKey || '',
          endpoint: provider.config?.endpoint || '',
          model: provider.config?.model || '',
          binaryPath: provider.config?.binaryPath || '',
          thinking: provider.config?.thinking || '',
          tools: provider.config?.tools || '',
          excludeTools: provider.config?.excludeTools || '',
          noTools: provider.config?.noTools || false,
        })
        setEditingId(providerId)
        setShowForm(true)
      }
    } catch (err) {
      setError(String(err))
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
      const url = editingId ? `/api/providers/${editingId}` : '/api/providers/configure'
      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
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
            binaryPath: formData.binaryPath,
          },
        }))
        setShowForm(false)
        setEditingId(null)
        setFormData({
          id: '',
          type: 'claude-code',
          name: '',
          apiKey: '',
          endpoint: '',
          model: '',
          binaryPath: '',
          thinking: '',
          tools: '',
          excludeTools: '',
          noTools: false,
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
        <p className="text-muted">Loading providers...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/settings" className="mb-4 inline-block text-primary hover:underline">
            ← Back to Settings
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Provider Configuration</h1>
          <p className="mt-2 text-muted">
            Configure AI providers (Claude Code, OpenAI, Pi, etc.) to enable agents to execute tasks
          </p>
        </div>

        {error && (
          <div className="mb-6 banner-error">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 banner-success">
            {success}
          </div>
        )}

        {/* Providers List */}
        <div className="mb-8 rounded-lg border border-border bg-surface p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Configured Providers</h2>
            <button
              onClick={() => {
                setShowForm(!showForm)
                if (showForm) {
                  setEditingId(null)
                  setFormData({
                    id: '',
                    type: 'claude-code',
                    name: '',
                    apiKey: '',
                    endpoint: '',
                    model: '',
                    binaryPath: '',
                    thinking: '',
                    tools: '',
                    excludeTools: '',
                    noTools: false,
                  })
                }
              }}
              className="rounded-lg bg-primary px-4 py-2 text-white hover:opacity-90"
            >
              {showForm ? 'Cancel' : '+ Add Provider'}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="mb-6 space-y-4 panel-info">
              <h3 className="text-lg font-semibold text-foreground">
                {editingId ? 'Edit Provider' : 'Add New Provider'}
              </h3>

              <div>
                <label className="block text-sm font-medium text-foreground">Provider Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  disabled={!!editingId}
                  className="mt-1 block w-full rounded-lg border border-border px-3 py-2 disabled:bg-border disabled:cursor-not-allowed"
                >
                  <option value="claude-code">Claude Code</option>
                  <option value="openai-compat">OpenAI Compatible</option>
                  <option value="pi">Pi</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., 'Claude on Laptop'"
                  className="mt-1 block w-full rounded-lg border border-border px-3 py-2"
                  required
                />
              </div>

              {formData.type !== 'pi' && (
                <div>
                  <label className="block text-sm font-medium text-foreground">API Key</label>
                  <input
                    type="password"
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    placeholder="sk-... or your API key"
                    className="mt-1 block w-full rounded-lg border border-border px-3 py-2"
                    required
                  />
                </div>
              )}
              {formData.type === 'pi' && (
                <div>
                  <label className="block text-sm font-medium text-foreground">Pi Binary Path</label>
                  <input
                    type="text"
                    value={formData.binaryPath || ''}
                    onChange={(e) => setFormData({ ...formData, binaryPath: e.target.value })}
                    placeholder="pi (or /path/to/pi)"
                    className="mt-1 block w-full rounded-lg border border-border px-3 py-2"
                  />
                  <p className="mt-1 text-xs text-muted">Leave empty to use &quot;pi&quot; from PATH</p>
                </div>
              )}

              {formData.type === 'openai-compat' && (
                <div>
                  <label className="block text-sm font-medium text-foreground">Endpoint URL</label>
                  <input
                    type="url"
                    value={formData.endpoint}
                    onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                    placeholder="https://api.example.com"
                    className="mt-1 block w-full rounded-lg border border-border px-3 py-2"
                    required={formData.type === 'openai-compat'}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground">Model (Optional)</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="e.g., claude-opus-5, gpt-4"
                  className="mt-1 block w-full rounded-lg border border-border px-3 py-2"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleTest(formData.id || 'new')}
                  disabled={testing === (formData.id || 'new')}
                  className="btn-warning flex-1"
                >
                  {testing === (formData.id || 'new') ? 'Testing...' : 'Test Connection'}
                </button>
                <button
                  type="submit"
                  className="btn-success flex-1"
                >
                  Save Provider
                </button>
              </div>

            </form>
          )}

          {testResult && (
            <div
              className={`mb-6 ${testResult.success ? 'banner-success' : 'banner-error'}`}
            >
              <p className="font-medium">
                {testResult.success ? '✅ Connection Successful' : '❌ Connection Failed'}
              </p>
              <p className="text-sm mt-1">{testResult.message}</p>
              {testResult.model && <p className="text-xs mt-1">Model: {testResult.model}</p>}
            </div>
          )}

          {providers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center">
              <p className="text-muted">No providers configured yet.</p>
              <p className="text-sm text-muted mt-1">Add your first provider to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {providers.map((provider) => (
                <div key={provider.id} className="rounded-lg border border-border p-4 hover:bg-background">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{provider.name}</h3>
                      <p className="text-sm text-muted capitalize">{provider.type.replace('-', ' ')}</p>
                      {provider.model && <p className="text-xs text-muted mt-1">Model: {provider.model}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(provider.id)}
                        className="rounded-lg bg-border px-3 py-1 text-sm text-foreground hover:opacity-80"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleTest(provider.id)}
                        disabled={testing === provider.id}
                        className="btn-soft-primary px-3 py-1 disabled:opacity-60"
                      >
                        {testing === provider.id ? 'Testing...' : 'Test'}
                      </button>
                      <button
                        onClick={() => handleDelete(provider.id)}
                        disabled={deleting === provider.id}
                        className="btn-soft-error px-3 py-1 disabled:opacity-60"
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
        <div className="rounded-lg border border-border bg-surface p-6">
          <h3 className="font-semibold text-foreground">About Providers</h3>
          <div className="mt-4 space-y-3 text-sm text-muted">
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
