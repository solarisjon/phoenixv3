import { database } from '@/lib/db/client'

export interface CostSummary {
  totalCost: number
  totalBudget?: number
  percentUsed: number
  breakdown: Record<string, number>
}

// Get total system cost
export async function getTotalSystemCost(): Promise<number> {
  try {
    const result = await database.get(
      'SELECT COALESCE(SUM(total_cost), 0) as total_cost FROM runs WHERE status IN ("completed", "failed")',
    )
    return result?.total_cost || 0
  } catch (error) {
    console.error('Error calculating system cost:', error)
    return 0
  }
}

// Get project cost breakdown
export async function getProjectCostSummary(projectId: string): Promise<CostSummary> {
  try {
    const result = await database.get(
      `
      SELECT
        COALESCE(SUM(r.total_cost), 0) as total_cost
      FROM runs r
      JOIN tasks t ON r.task_id = t.id
      WHERE t.project_id = ? AND r.status IN ('completed', 'failed')
    `,
      [projectId],
    )

    const project = await database.get('SELECT total_budget FROM projects WHERE id = ?', [
      projectId,
    ])

    const totalCost = result?.total_cost || 0
    const totalBudget = project?.total_budget

    return {
      totalCost,
      totalBudget,
      percentUsed: totalBudget ? (totalCost / totalBudget) * 100 : 0,
      breakdown: {},
    }
  } catch (error) {
    console.error('Error calculating project cost:', error)
    return {
      totalCost: 0,
      percentUsed: 0,
      breakdown: {},
    }
  }
}

// Get cost breakdown by provider
export async function getCostByProvider(): Promise<Record<string, number>> {
  try {
    const results = await database.all(
      `
      SELECT p.name, COALESCE(SUM(cl.amount), 0) as total_cost
      FROM cost_logs cl
      JOIN providers p ON cl.provider_id = p.id
      GROUP BY cl.provider_id, p.name
      ORDER BY total_cost DESC
    `,
    )

    const breakdown: Record<string, number> = {}
    for (const row of results) {
      breakdown[row.name] = row.total_cost
    }
    return breakdown
  } catch (error) {
    console.error('Error calculating cost by provider:', error)
    return {}
  }
}

// Get cost breakdown by agent
export async function getCostByAgent(): Promise<Record<string, number>> {
  try {
    const results = await database.all(
      `
      SELECT a.name, COALESCE(SUM(r.total_cost), 0) as total_cost
      FROM runs r
      JOIN agents a ON r.agent_id = a.id
      WHERE r.status IN ('completed', 'failed')
      GROUP BY r.agent_id, a.name
      ORDER BY total_cost DESC
    `,
    )

    const breakdown: Record<string, number> = {}
    for (const row of results) {
      breakdown[row.name] = row.total_cost
    }
    return breakdown
  } catch (error) {
    console.error('Error calculating cost by agent:', error)
    return {}
  }
}

// Get cost breakdown by project
export async function getCostByProject(): Promise<Record<string, number>> {
  try {
    const results = await database.all(
      `
      SELECT p.name, COALESCE(SUM(r.total_cost), 0) as total_cost
      FROM runs r
      JOIN tasks t ON r.task_id = t.id
      JOIN projects p ON t.project_id = p.id
      WHERE r.status IN ('completed', 'failed')
      GROUP BY t.project_id, p.name
      ORDER BY total_cost DESC
    `,
    )

    const breakdown: Record<string, number> = {}
    for (const row of results) {
      breakdown[row.name] = row.total_cost
    }
    return breakdown
  } catch (error) {
    console.error('Error calculating cost by project:', error)
    return {}
  }
}

// Get agent budget status
export async function getAgentBudgetStatus(
  agentId: string,
): Promise<{ spent: number; budget: number; percentUsed: number; isOver: boolean }> {
  try {
    const agent = await database.get('SELECT cost_budget FROM agents WHERE id = ?', [agentId])
    if (!agent) {
      return { spent: 0, budget: 0, percentUsed: 0, isOver: false }
    }

    const result = await database.get(
      'SELECT COALESCE(SUM(total_cost), 0) as total_cost FROM runs WHERE agent_id = ? AND status IN ("completed", "failed")',
      [agentId],
    )

    const spent = result?.total_cost || 0
    const budget = agent.cost_budget
    const percentUsed = (spent / budget) * 100
    const isOver = spent >= budget

    return { spent, budget, percentUsed, isOver }
  } catch (error) {
    console.error('Error calculating agent budget:', error)
    return { spent: 0, budget: 0, percentUsed: 0, isOver: false }
  }
}

// Get cost trend over time (last 7 days)
export async function getCostTrend(): Promise<Array<{ date: string; cost: number }>> {
  try {
    const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60

    const results = await database.all(
      `
      SELECT
        DATE(datetime(r.created_at, 'unixepoch')) as date,
        COALESCE(SUM(r.total_cost), 0) as total_cost
      FROM runs r
      WHERE r.created_at >= ? AND r.status IN ('completed', 'failed')
      GROUP BY DATE(datetime(r.created_at, 'unixepoch'))
      ORDER BY r.created_at ASC
    `,
      [sevenDaysAgo],
    )

    return results.map((row: any) => ({
      date: row.date,
      cost: row.total_cost,
    }))
  } catch (error) {
    console.error('Error calculating cost trend:', error)
    return []
  }
}
