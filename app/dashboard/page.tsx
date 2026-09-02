'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import CostBreakdown from '@/components/dashboard/CostBreakdown'
import StatusBadge from '@/components/ui/StatusBadge'

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
    fetchDashboardData(true)
  }, [])

  // Poll for updates so running/failed tasks and costs reflect live state
  useEffect(() => {
    const interval = setInterval(() => fetchDashboardData(false), 3000)
    return () => clearInterval(interval)
  }, [])

  const fetchDashboardData = async (isInitial: boolean) => {
    try {
      if (isInitial) setIsLoading(true)

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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const agentsOverBudget = agents.filter(
    (a) => (a.total_cost || 0) >= a.cost_budget,
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-2 text-muted">System-wide overview and status</p>
        </div>

        {/* Top stats */}
        <div className="mb-8 grid gap-6 md:grid-cols-4">
          <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
            <p className="text-sm text-muted">Total Cost</p>
            <p className="mt-2 text-3xl font-bold text-foreground">
              ${totalCost.toFixed(2)}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
            <p className="text-sm text-muted">Total Agents</p>
            <p className="mt-2 text-3xl font-bold text-foreground">
              {agents.length}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
            <p className="text-sm text-muted">Active Runs</p>
            <p className="mt-2 text-3xl font-bold text-foreground">
              {runs.filter((r) => r.status === 'running').length}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
            <p className="text-sm text-muted">Failed Runs</p>
            <p className="mt-2 text-3xl font-bold text-error">
              {failedRuns.length}
            </p>
          </div>
        </div>

        {/* Failed agents alert */}
        {agentsOverBudget.length > 0 && (
          <div className="mb-8 panel-error">
            <h3 className="font-semibold text-error">⚠️ Agents Over Budget</h3>
            <p className="mt-2 text-sm text-error">
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
            <h2 className="text-xl font-bold text-foreground">Recent Runs</h2>
            <Link
              href="/runs"
              className="text-sm text-primary hover:underline"
            >
              View All →
            </Link>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-background">
                <tr>
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
                    Started
                  </th>
                  <th className="px-6 py-3 text-right font-medium text-foreground">
                    Cost
                  </th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="border-b border-border hover:bg-background">
                    <td className="px-6 py-3 font-medium text-foreground">
                      {run.task_name}
                    </td>
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
        </div>
      </div>
    </div>
  )
}
