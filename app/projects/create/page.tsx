'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function CreateProjectPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    baseDirectory: '',
  })
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.name.trim()) {
      setError('Project name is required')
      return
    }

    try {
      setIsLoading(true)
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create project')
      }

      router.push('/projects')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/projects" className="mb-6 inline-block text-primary hover:underline">
          ← Back to Projects
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Create Project</h1>
          <p className="mt-2 text-muted">Start a new project</p>
        </div>

        <div className="rounded-lg bg-surface p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="banner-error">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground">
                Project Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:ring-primary"
                placeholder="e.g., Q4 Data Analysis"
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
                placeholder="What is this project about?"
                rows={4}
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground">
                Working Directory (Optional)
              </label>
              <input
                type="text"
                value={formData.baseDirectory}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, baseDirectory: e.target.value }))
                }
                className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm font-mono focus:border-primary focus:ring-primary"
                placeholder="e.g., /Users/you/projects/my-project"
                disabled={isLoading}
              />
              <p className="mt-1 text-xs text-muted">
                Where task outputs and artifacts are written. Must be an absolute path. Leave blank to use
                a default folder under <code className="text-xs">~/.phoenix</code>.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {isLoading ? 'Creating...' : 'Create Project'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
