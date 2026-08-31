'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import CostBreakdown from '@/components/dashboard/CostBreakdown'

interface Run {
  id: string
  task_name: string
  agent_name: string
  status: string
  created_at: number
  total_cost: number
}

interface Agent {
  id: string
  name: string
  provider_name: string
  total_cost?: number
  cost_budget: number
}

export default function DashboardPage() {
  const [runs, setRuns] = useState<Run[]>([])
  const [failedRuns, setFailedRuns] = useState<Run[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [totalCost, setTotalCost] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)

      // Fetch all data in parallel
      const [costsRes, agentsRes, runsRes] = await Promise.all([
        fetch('/api/costs'),
        fetch('/api/agents'),
        fetch('/api/runs'),
      ])

      if (costsRes.ok) {
        const data = await costsRes.json()
        setTotalCost(data.totalCost)
      }

      if (agentsRes.ok) {
        const data = await agentsRes.json()
        setAgents(data)
      }

      if (runsRes.ok) {
        const data = await runsRes.json()
        // Sort by created_at descending
        const sorted = data.sort(
          (a: Run, b: Run) => b.created_at - a.created_at,
        )
        setRuns(sorted.slice(0, 10)) // Latest 10
        setFailedRuns(sorted.filter((r: Run) => r.status === 'failed').slice(0, 5))
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'running':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const agentsOverBudget = agents.filter(
    (a) => (a.total_cost || 0) >= a.cost_budget,
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">System-wide overview and status</p>
        </div>

        {/* Top stats */}
        <div className="mb-8 grid gap-6 md:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-600">Total Cost</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              ${totalCost.toFixed(2)}
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-600">Total Agents</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {agents.length}
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-600">Active Runs</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {runs.filter((r) => r.status === 'running').length}
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-600">Failed Runs</p>
            <p className="mt-2 text-3xl font-bold text-red-600">
              {failedRuns.length}
            </p>
          </div>
        </div>

        {/* Failed agents alert */}
        {agentsOverBudget.length > 0 && (
          <div className="mb-8 rounded-lg border border-red-200 bg-red-50 p-6">
            <h3 className="font-semibold text-red-900">⚠️ Agents Over Budget</h3>
            <p className="mt-2 text-sm text-red-800">
              {agentsOverBudget.map((a) => (
                <div key={a.id}>
                  {a.name}: ${(a.total_cost || 0).toFixed(2)} / ${a.cost_budget.toFixed(2)}
                </div>
              ))}
            </p>
          </div>
        )}

        {/* Cost breakdowns */}
        <div className="mb-8 grid gap-6 md:grid-cols-3">
          <CostBreakdown breakdown="provider" title="Cost by Provider" />
          <CostBreakdown breakdown="agent" title="Cost by Agent" />
          <CostBreakdown breakdown="project" title="Cost by Project" />
        </div>

        {/* Recent runs */}
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Recent Runs</h2>
            <Link
              href="/runs"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View All →
            </Link>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
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
                    Started
                  </th>
                  <th className="px-6 py-3 text-right font-medium text-gray-900">
                    Cost
                  </th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">
                      {run.task_name}
                    </td>
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
        </div>
      </div>
    </div>
  )
}
