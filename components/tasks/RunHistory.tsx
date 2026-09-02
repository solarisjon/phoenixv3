'use client'

import { useCallback, useEffect, useState } from 'react'
import StatusBadge from '@/components/ui/StatusBadge'

interface Run {
  id: string
  status: string
  started_at?: number
  ended_at?: number
  total_cost: number
  created_at: number
}

interface RunHistoryProps {
  taskId: string
}

export default function RunHistory({ taskId }: RunHistoryProps) {
  const [runs, setRuns] = useState<Run[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRuns = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`/api/runs?taskId=${taskId}`)
      if (!res.ok) throw new Error('Failed to fetch runs')
      const data = await res.json()
      setRuns(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load runs')
    } finally {
      setIsLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    fetchRuns()
  }, [fetchRuns])

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  const getDuration = (started?: number, ended?: number) => {
    if (!started || !ended) return '-'
    const seconds = ended - started
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    return `${Math.floor(seconds / 3600)}h`
  }

  if (isLoading) {
    return <div className="text-center text-muted">Loading runs...</div>
  }

  if (error) {
    return <div className="banner-error">{error}</div>
  }

  if (runs.length === 0) {
    return (
      <div className="empty-state">
        <p className="text-muted">No runs yet. Trigger a run to get started.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-background">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-foreground">Run ID</th>
            <th className="px-4 py-3 text-left font-medium text-foreground">Status</th>
            <th className="px-4 py-3 text-left font-medium text-foreground">Started</th>
            <th className="px-4 py-3 text-left font-medium text-foreground">Duration</th>
            <th className="px-4 py-3 text-right font-medium text-foreground">Cost</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id} className="border-b border-border hover:bg-background">
              <td className="px-4 py-3 font-mono text-xs text-muted">
                {run.id.slice(0, 8)}...
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={run.status} />
              </td>
              <td className="px-4 py-3 text-muted">
                {run.created_at ? formatDate(run.created_at) : '-'}
              </td>
              <td className="px-4 py-3 text-muted">
                {getDuration(run.started_at, run.ended_at)}
              </td>
              <td className="px-4 py-3 text-right text-foreground">
                ${run.total_cost.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
