'use client'

import { useState, useEffect } from 'react'

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
    fetchRuns()
  }, [])

  const fetchRuns = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/runs')
      if (!res.ok) throw new Error('Failed to fetch runs')
      const data = await res.json()
      setRuns(data.sort((a: Run, b: Run) => b.created_at - a.created_at))
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

  const filteredRuns =
    filter === 'all'
      ? runs
      : runs.filter((r) => r.status === filter)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Runs</h1>
          <p className="mt-2 text-gray-600">All task executions</p>
        </div>

        {error && (
          <div className="mb-8 rounded-lg bg-red-50 p-4 text-sm text-red-800">
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
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center text-gray-600">Loading runs...</div>
        ) : filteredRuns.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
            <p className="text-gray-600">No {filter !== 'all' ? filter : ''} runs yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-gray-900">
                    Run ID
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-900">
                    Task
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-900">
                    Agent
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-900">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right font-medium text-gray-900">
                    Cost
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRuns.map((run) => (
                  <tr key={run.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-3 font-mono text-xs text-gray-600">
                      {run.id.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-3 text-gray-900">{run.task_name}</td>
                    <td className="px-6 py-3 text-gray-600">{run.agent_name}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-block rounded px-2 py-1 text-xs font-medium ${getStatusColor(run.status)}`}
                      >
                        {run.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {formatDate(run.created_at)}
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-gray-900">
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
