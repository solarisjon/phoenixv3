'use client'

import { useEffect, useState } from 'react'

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

  useEffect(() => {
    fetchRuns()
  }, [taskId])

  const fetchRuns = async () => {
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
    return <div className="text-center text-gray-600">Loading runs...</div>
  }

  if (error) {
    return <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</div>
  }

  if (runs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
        <p className="text-gray-600">No runs yet. Trigger a run to get started.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-900">Run ID</th>
            <th className="px-4 py-3 text-left font-medium text-gray-900">Status</th>
            <th className="px-4 py-3 text-left font-medium text-gray-900">Started</th>
            <th className="px-4 py-3 text-left font-medium text-gray-900">Duration</th>
            <th className="px-4 py-3 text-right font-medium text-gray-900">Cost</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id} className="border-b border-gray-200 hover:bg-gray-50">
              <td className="px-4 py-3 font-mono text-xs text-gray-600">
                {run.id.slice(0, 8)}...
              </td>
              <td className="px-4 py-3">
                <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${getStatusColor(run.status)}`}>
                  {run.status}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-600">
                {run.created_at ? formatDate(run.created_at) : '-'}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {getDuration(run.started_at, run.ended_at)}
              </td>
              <td className="px-4 py-3 text-right text-gray-900">
                ${run.total_cost.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
