'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import TaskForm from '@/components/tasks/TaskForm'
import StatusBadge from '@/components/ui/StatusBadge'

interface Project {
  id: string
  name: string
  description: string
  base_directory: string
  total_cost: number
  created_at: number
}

interface Task {
  id: string
  name: string
  description: string
  agent_name: string
  schedule_cron?: string
  enabled: boolean
}

interface Run {
  id: string
  task_name: string
  agent_name: string
  status: string
  created_at: number
  total_cost: number
  logs?: string
  artifacts?: Array<{ name: string; size: number }>
}

export default function ProjectDetailPage() {
  const params = useParams()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [runs, setRuns] = useState<Run[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [autoRefresh] = useState(true) // Poll for run updates every 2 seconds
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null)

  useEffect(() => {
    fetchProjectData()
  }, [projectId])

  // Auto-refresh runs every 2 seconds
  useEffect(() => {
    if (!autoRefresh || !projectId) return
    const interval = setInterval(() => fetchRuns(), 2000)
    return () => clearInterval(interval)
  }, [projectId, autoRefresh])

  const fetchRuns = async () => {
    try {
      // Fetch runs for all tasks in this project
      const tasksRes = await fetch(`/api/tasks?projectId=${projectId}`)
      if (!tasksRes.ok) return

      const tasksData = await tasksRes.json()
      const allRuns: Run[] = []

      for (const task of tasksData) {
        const runsRes = await fetch(`/api/runs?taskId=${task.id}`)
        if (runsRes.ok) {
          const taskRuns = await runsRes.json()

          // Fetch output for each run
          for (const run of taskRuns) {
            const outputRes = await fetch(`/api/runs/${run.id}/output`)
            if (outputRes.ok) {
              const outputData = await outputRes.json()
              run.logs = outputData.logs
              run.artifacts = outputData.artifacts
            }
          }

          allRuns.push(...taskRuns)
        }
      }

      // Sort by created_at descending
      setRuns(allRuns.sort((a, b) => b.created_at - a.created_at))
    } catch (err) {
      console.error('Error fetching runs:', err)
    }
  }

  const fetchProjectData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch project
      const projectRes = await fetch('/api/projects')
      if (!projectRes.ok) throw new Error('Failed to fetch projects')
      const projects = await projectRes.json()
      const found = projects.find((p: Project) => p.id === projectId)

      if (!found) {
        setError('Project not found')
        return
      }

      setProject(found)

      // Fetch tasks
      const tasksRes = await fetch(`/api/tasks?projectId=${projectId}`)
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json()
        setTasks(tasksData)
      }

      // Fetch runs
      await fetchRuns()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTaskCreated = () => {
    setShowTaskForm(false)
    fetchProjectData()
  }

  const handleRunTask = async (taskId: string) => {
    setRunningTaskId(taskId)
    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to start run')
      }
      await fetchRuns()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start run')
    } finally {
      setRunningTaskId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted">Loading project...</p>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <Link href="/projects" className="mb-6 inline-block text-primary">
            ← Back to Projects
          </Link>
          <div className="panel-error text-center">
            <p className="text-error">{error || 'Project not found'}</p>
            <Link
              href="/projects"
              className="mt-4 inline-block text-primary hover:underline"
            >
              Return to projects →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString()
  }


  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return '⚙️'
      case 'completed':
        return '✅'
      case 'failed':
        return '❌'
      case 'pending':
        return '⏳'
      default:
        return '•'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/projects" className="mb-6 inline-block text-primary hover:underline">
          ← Back to Projects
        </Link>

        {/* Project Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
          <p className="mt-2 text-muted">{project.description}</p>
          <div className="mt-4 flex gap-6 text-sm text-muted">
            <div>
              <span className="font-medium">Working Directory:</span>
              <p className="font-mono text-xs text-foreground">{project.base_directory}</p>
            </div>
            <div>
              <span className="font-medium">Created:</span>
              <p>{formatDate(project.created_at)}</p>
            </div>
            <div>
              <span className="font-medium">Total Cost:</span>
              <p className="text-lg font-bold text-foreground">
                ${project.total_cost.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Tasks Section */}
        <div className="mb-8 rounded-lg border border-border bg-surface p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Tasks</h2>
            <button
              onClick={() => setShowTaskForm(!showTaskForm)}
              className="rounded-lg bg-primary px-4 py-2 text-white hover:opacity-90"
            >
              {showTaskForm ? 'Cancel' : 'Create Task'}
            </button>
          </div>

          {showTaskForm && (
            <div className="mb-6 panel-info">
              <TaskForm
                projectId={projectId}
                onSubmit={async (data) => {
                  const res = await fetch('/api/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                  })
                  if (!res.ok) throw new Error('Failed to create task')
                  handleTaskCreated()
                }}
              />
            </div>
          )}

          {tasks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center">
              <p className="text-muted">No tasks yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-lg border border-border p-4 hover:bg-background"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{task.name}</h3>
                      <p className="text-sm text-muted">{task.description}</p>
                    </div>
                    <div className="text-sm">
                      {task.enabled ? (
                        <span className="badge-success rounded-full px-2 py-1">
                          Scheduled
                        </span>
                      ) : (
                        <span className="badge-neutral rounded-full px-2 py-1">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted">
                    <span>Agent: {task.agent_name}</span>
                    <div className="flex items-center gap-3">
                      {task.schedule_cron && <span>Schedule: {task.schedule_cron}</span>}
                      <button
                        onClick={() => handleRunTask(task.id)}
                        disabled={runningTaskId === task.id}
                        className="btn-soft-success px-3 py-1 disabled:opacity-60"
                      >
                        {runningTaskId === task.id ? 'Starting...' : '▶ Run Now'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Runs Section */}
        <div className="mb-8 rounded-lg border border-border bg-surface p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">
              {runs.length > 0 ? '📊 Recent Runs' : 'No Runs Yet'}
            </h2>
            {autoRefresh && runs.some((r) => r.status === 'running') && (
              <span className="text-sm text-primary">🔄 Live updates</span>
            )}
          </div>

          {runs.length === 0 ? (
            <div className="text-center text-muted">
              <p>No runs yet. Create a task to start working.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {runs.slice(0, 10).map((run) => (
                <div
                  key={run.id}
                  className={`rounded-lg border p-4 ${
                    run.status === 'running'
                      ? 'highlight-info'
                      : 'border-border bg-background'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getStatusIcon(run.status)}</span>
                        <div>
                          <p className="font-medium text-foreground">{run.task_name}</p>
                          <p className="text-xs text-muted">
                            Agent: {run.agent_name}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={run.status} />
                      <p className="mt-1 text-xs text-muted">
                        ${run.total_cost.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {run.logs && (
                    // Intentionally literal: a terminal readout stays dark like a real
                    // console regardless of app theme (see theming plan, issue #17).
                    <div className="mt-3 bg-black text-green-400 rounded p-2 font-mono text-xs overflow-x-auto max-h-32 overflow-y-auto">
                      <pre className="whitespace-pre-wrap break-words">
                        {run.logs.split('\n').slice(-10).join('\n')}
                      </pre>
                    </div>
                  )}

                  {run.artifacts && run.artifacts.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {run.artifacts.map((artifact) => (
                        <a
                          key={artifact.name}
                          href={`/api/runs/${run.id}/artifacts/${encodeURIComponent(artifact.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-soft-primary px-2 py-1 text-xs"
                        >
                          📄 {artifact.name}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-foreground">About This Project</h2>
          <div className="space-y-2 text-sm text-muted">
            <p>
              <strong>Project ID:</strong> <code className="text-xs text-foreground">{project.id}</code>
            </p>
            <p>
              <strong>Storage:</strong> All artifacts and logs are stored in the working directory
              above and can be recovered if a task fails.
            </p>
            <p>
              <strong>Tasks:</strong> Create tasks to assign work to agents. Tasks can be scheduled
              to run automatically or triggered manually.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
