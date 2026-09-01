'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import TaskForm from '@/components/tasks/TaskForm'

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
        <p className="text-gray-600">Loading project...</p>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <Link href="/projects" className="mb-6 inline-block text-blue-600">
            ← Back to Projects
          </Link>
          <div className="rounded-lg bg-red-50 p-6 text-center">
            <p className="text-red-800">{error || 'Project not found'}</p>
            <Link
              href="/projects"
              className="mt-4 inline-block text-blue-600 hover:text-blue-700"
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'running':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
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
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/projects" className="mb-6 inline-block text-blue-600 hover:text-blue-700">
          ← Back to Projects
        </Link>

        {/* Project Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
          <p className="mt-2 text-gray-600">{project.description}</p>
          <div className="mt-4 flex gap-6 text-sm text-gray-600">
            <div>
              <span className="font-medium">Working Directory:</span>
              <p className="font-mono text-xs text-gray-700">{project.base_directory}</p>
            </div>
            <div>
              <span className="font-medium">Created:</span>
              <p>{formatDate(project.created_at)}</p>
            </div>
            <div>
              <span className="font-medium">Total Cost:</span>
              <p className="text-lg font-bold text-gray-900">
                ${project.total_cost.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Tasks Section */}
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Tasks</h2>
            <button
              onClick={() => setShowTaskForm(!showTaskForm)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              {showTaskForm ? 'Cancel' : 'Create Task'}
            </button>
          </div>

          {showTaskForm && (
            <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-6">
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
            <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
              <p className="text-gray-600">No tasks yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{task.name}</h3>
                      <p className="text-sm text-gray-600">{task.description}</p>
                    </div>
                    <div className="text-sm">
                      {task.enabled ? (
                        <span className="rounded-full bg-green-100 px-2 py-1 text-green-800">
                          Scheduled
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-800">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Agent: {task.agent_name}</span>
                    <div className="flex items-center gap-3">
                      {task.schedule_cron && <span>Schedule: {task.schedule_cron}</span>}
                      <button
                        onClick={() => handleRunTask(task.id)}
                        disabled={runningTaskId === task.id}
                        className="rounded-lg bg-green-100 px-3 py-1 text-sm text-green-700 hover:bg-green-200 disabled:bg-gray-200"
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
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              {runs.length > 0 ? '📊 Recent Runs' : 'No Runs Yet'}
            </h2>
            {autoRefresh && runs.some((r) => r.status === 'running') && (
              <span className="text-sm text-blue-600">🔄 Live updates</span>
            )}
          </div>

          {runs.length === 0 ? (
            <div className="text-center text-gray-600">
              <p>No runs yet. Create a task to start working.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {runs.slice(0, 10).map((run) => (
                <div
                  key={run.id}
                  className={`rounded-lg border p-4 ${
                    run.status === 'running'
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getStatusIcon(run.status)}</span>
                        <div>
                          <p className="font-medium text-gray-900">{run.task_name}</p>
                          <p className="text-xs text-gray-600">
                            Agent: {run.agent_name}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block rounded px-2 py-1 text-xs font-medium ${getStatusColor(run.status)}`}
                      >
                        {run.status}
                      </span>
                      <p className="mt-1 text-xs text-gray-500">
                        ${run.total_cost.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {run.logs && (
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
                          className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 hover:bg-blue-200"
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
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-gray-900">About This Project</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <strong>Project ID:</strong> <code className="text-xs text-gray-700">{project.id}</code>
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
