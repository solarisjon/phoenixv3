'use client'

import { useState } from 'react'

interface Snapshot {
  id: string
  snapshot_dir: string
  stateMetadata: Record<string, unknown>
  created_at: number
}

interface RecoveryUIProps {
  runId: string
  status: string
  snapshots?: Snapshot[]
  onRetry?: () => Promise<void>
  onResume?: (snapshotId: string) => Promise<void>
}

export default function RecoveryUI({
  runId,
  status,
  snapshots = [],
  onRetry,
  onResume,
}: RecoveryUIProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null)

  const isFailed = status === 'failed'
  const hasSnapshots = snapshots.length > 0

  const handleRetry = async () => {
    try {
      setIsLoading(true)
      setError(null)
      if (onRetry) {
        await onRetry()
      } else {
        // Call API directly
        const res = await fetch(`/api/runs/${runId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'retry' }),
        })
        if (!res.ok) throw new Error('Failed to retry run')
        const data = await res.json()
        alert(`Retry run created: ${data.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResume = async () => {
    if (!selectedSnapshot) {
      setError('Please select a snapshot')
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      if (onResume) {
        await onResume(selectedSnapshot)
      } else {
        // Call API directly
        const res = await fetch(`/api/runs/${runId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'resume', snapshotId: selectedSnapshot }),
        })
        if (!res.ok) throw new Error('Failed to resume run')
        const data = await res.json()
        alert(`Resume run created: ${data.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isFailed) {
    return null
  }

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6">
      <h3 className="mb-4 text-lg font-semibold text-red-900">Run Failed</h3>

      {error && (
        <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {hasSnapshots && (
          <div>
            <label className="mb-2 block text-sm font-medium text-red-900">
              Resume from Checkpoint
            </label>
            <select
              value={selectedSnapshot || ''}
              onChange={(e) => setSelectedSnapshot(e.target.value)}
              className="block w-full rounded border border-red-300 px-3 py-2 text-sm"
              disabled={isLoading}
            >
              <option value="">Select a snapshot</option>
              {snapshots.map((snapshot) => (
                <option key={snapshot.id} value={snapshot.id}>
                  {new Date(snapshot.created_at * 1000).toLocaleString()}
                </option>
              ))}
            </select>

            <button
              onClick={handleResume}
              disabled={isLoading || !selectedSnapshot}
              className="mt-3 w-full rounded bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 disabled:bg-gray-400"
            >
              {isLoading ? 'Resuming...' : 'Resume from Checkpoint'}
            </button>
          </div>
        )}

        <div className="border-t border-red-200 pt-4">
          <p className="mb-3 text-sm text-red-900">Or start over:</p>
          <button
            onClick={handleRetry}
            disabled={isLoading}
            className="w-full rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:bg-gray-400"
          >
            {isLoading ? 'Retrying...' : 'Retry Run'}
          </button>
        </div>
      </div>
    </div>
  )
}
