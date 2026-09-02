'use client'

import Link from 'next/link'

interface AgentCardProps {
  id: string
  name: string
  description: string
  provider_name: string
  model: string
  cost_budget: number
  total_cost?: number
}

export default function AgentCard({
  id,
  name,
  description,
  provider_name,
  model,
  cost_budget,
  total_cost = 0,
}: AgentCardProps) {
  const budgetUsage = ((total_cost / cost_budget) * 100).toFixed(1)
  const isOverBudget = total_cost >= cost_budget

  return (
    <div className="card transition-shadow hover:shadow-md">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">{name}</h3>
        <p className="text-sm text-muted">{description}</p>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted">Provider:</span>
          <span className="font-medium">{provider_name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Model:</span>
          <span className="font-medium">{model}</span>
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-muted">Budget Usage:</span>
          <span className={isOverBudget ? 'font-medium text-error' : 'font-medium text-foreground'}>
            ${total_cost.toFixed(2)} / ${cost_budget.toFixed(2)}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-border">
          <div
            className={`h-full ${isOverBudget ? 'bg-error' : 'bg-success'}`}
            style={{ width: `${Math.min(parseFloat(budgetUsage), 100)}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-muted">{budgetUsage}% used</p>
      </div>

      <div className="mt-4 flex gap-2">
        <Link href={`/agents/${id}/edit`} className="btn-soft-primary flex-1">
          Edit
        </Link>
      </div>
    </div>
  )
}
