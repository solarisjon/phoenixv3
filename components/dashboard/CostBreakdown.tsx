'use client'

import { useCallback, useEffect, useState } from 'react'

interface CostData {
  [key: string]: number
}

interface CostBreakdownProps {
  breakdown: 'provider' | 'agent' | 'project'
  title: string
}

export default function CostBreakdown({ breakdown, title }: CostBreakdownProps) {
  const [data, setData] = useState<CostData>({})
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const fetchCosts = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`/api/costs?breakdown=${breakdown}`)
      if (!res.ok) throw new Error('Failed to fetch costs')
      const result = await res.json()
      setData(result.breakdown || {})
      setTotal(result.totalCost || 0)
    } catch (err) {
      console.error('Error fetching costs:', err)
    } finally {
      setIsLoading(false)
    }
  }, [breakdown])

  useEffect(() => {
    fetchCosts()
  }, [fetchCosts])

  const entries = Object.entries(data).sort(([, a], [, b]) => b - a)
  const others = entries.slice(5)
  const topEntries = entries.slice(0, 5)

  if (isLoading) {
    return <div className="text-center text-gray-600">Loading...</div>
  }

  const colors = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
  ]

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>

      <div className="mb-6 text-3xl font-bold text-gray-900">
        ${total.toFixed(2)}
      </div>

      <div className="space-y-3">
        {topEntries.map(([name, cost], index) => (
          <div key={name}>
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <span className="text-sm font-medium text-gray-900">{name}</span>
              </div>
              <span className="text-sm font-medium text-gray-600">
                ${cost.toFixed(2)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full"
                style={{
                  width: `${(cost / total) * 100}%`,
                  backgroundColor: colors[index % colors.length],
                }}
              />
            </div>
          </div>
        ))}

        {others.length > 0 && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">
                Other ({others.length})
              </span>
              <span className="text-sm font-medium text-gray-600">
                ${others.reduce((sum, [, cost]) => sum + cost, 0).toFixed(2)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-gray-400"
                style={{
                  width: `${(others.reduce((sum, [, cost]) => sum + cost, 0) / total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
