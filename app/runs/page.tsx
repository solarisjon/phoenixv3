'use client'

import { useState, useEffect } from 'react'
import StatusBadge from '@/components/ui/StatusBadge'

interface Run {
  id: string
  task_name: string
  agent_name: string
  status: string
  started_at?: number
  ended_at?: number
  total_cost: number
  created_at: number
}

export default function RunsPage() {
  const [runs, setRuns] = useState<Run[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    fetchRuns(true)
  }, [])

  // Poll for updates so runs move through pending -> running -> completed/failed live
  useEffect(() => {
    const interval = setInterval(() => fetchRuns(false), 3000)
    return () => clearInterval(interval)
  }, [])

  const fetchRuns = async (isInitial: boolean) => {
    try {
      if (isInitial) setIsLoading(true)
      const res = await fetch('/api/runs')
      if (!res.ok) throw new Error('Failed to fetch runs')
      const data = await res.json()
      setRuns(data.sort((a: Run, b: Run) => b.created_at - a.created_at))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load runs')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  const filteredRuns =
    filter === 'all'
      ? runs
      : runs.filter((r) => r.status === filter)

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Runs</h1>
          <p className="mt-2 text-muted">All task executions</p>
        </div>

        {error && (
          <div className="mb-8 banner-error">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex gap-2">
          {['all', 'completed', 'running', 'failed', 'pending'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-primary text-white'
                  : 'bg-surface text-foreground hover:bg-background'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center text-muted">Loading runs...</div>
        ) : filteredRuns.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface p-12 text-center">
            <p className="text-muted">No {filter !== 'all' ? filter : ''} runs yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-background">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-foreground">
                    Run ID
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-foreground">
                    Task
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-foreground">
                    Agent
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-foreground">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-foreground">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right font-medium text-foreground">
                    Cost
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRuns.map((run) => (
                  <tr key={run.id} className="border-b border-border hover:bg-background">
                    <td className="px-6 py-3 font-mono text-xs text-muted">
                      {run.id.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-3 text-foreground">{run.task_name}</td>
                    <td className="px-6 py-3 text-muted">{run.agent_name}</td>
                    <td className="px-6 py-3">
                      <StatusBadge status={run.status} />
                    </td>
                    <td className="px-6 py-3 text-muted">
                      {formatDate(run.created_at)}
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-foreground">
                      ${run.total_cost.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
