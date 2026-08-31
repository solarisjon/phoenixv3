'use client'

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
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Provider:</span>
          <span className="font-medium">{provider_name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Model:</span>
          <span className="font-medium">{model}</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-gray-600">Budget Usage:</span>
          <span className={isOverBudget ? 'font-medium text-red-600' : 'font-medium text-gray-900'}>
            ${total_cost.toFixed(2)} / ${cost_budget.toFixed(2)}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full ${isOverBudget ? 'bg-red-500' : 'bg-green-500'}`}
            style={{ width: `${Math.min(parseFloat(budgetUsage), 100)}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-gray-600">{budgetUsage}% used</p>
      </div>
    </div>
  )
}
