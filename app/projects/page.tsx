'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Project {
  id: string
  name: string
  description: string
  total_cost: number
  created_at: number
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/projects')
      if (!res.ok) throw new Error('Failed to fetch projects')
      const data = await res.json()
      setProjects(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Projects</h1>
            <p className="mt-2 text-muted">Manage your projects</p>
          </div>
          <Link
            href="/projects/create"
            className="rounded-lg bg-primary px-4 py-2 text-white hover:opacity-90"
          >
            New Project
          </Link>
        </div>

        {error && (
          <div className="banner-error">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-center text-muted">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface p-12 text-center">
            <p className="text-muted">No projects yet.</p>
            <Link
              href="/projects/create"
              className="mt-4 inline-block text-primary hover:underline"
            >
              Create your first project →
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block rounded-lg border border-border bg-surface p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <h3 className="text-lg font-semibold text-foreground">
                  {project.name}
                </h3>
                <p className="mt-2 text-sm text-muted">{project.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-muted">
                    {formatDate(project.created_at)}
                  </span>
                  <span className="text-lg font-bold text-foreground">
                    ${project.total_cost.toFixed(2)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
