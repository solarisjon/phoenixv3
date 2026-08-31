import { database } from '@/lib/db/client'
import { WebhookPayload } from '@/lib/types/domain'

export async function processWebhook(
  agentId: string,
  payload: WebhookPayload,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate payload
    if (!payload.runId || !payload.status) {
      return { success: false, error: 'Missing required fields: runId, status' }
    }

    // Verify run exists and belongs to this agent
    const run = await database.get('SELECT * FROM runs WHERE id = ? AND agent_id = ?', [
      payload.runId,
      agentId,
    ])

    if (!run) {
      return { success: false, error: 'Run not found or does not belong to this agent' }
    }

    // Update run status
    await database.run('UPDATE runs SET status = ?, ended_at = ? WHERE id = ?', [
      payload.status,
      payload.status === 'completed' || payload.status === 'failed'
        ? Math.floor(Date.now() / 1000)
        : null,
      payload.runId,
    ])

    // Update run cost if provided
    if (payload.cost && payload.cost > 0) {
      await database.run('UPDATE runs SET total_cost = ? WHERE id = ?', [
        payload.cost,
        payload.runId,
      ])

      // Log cost
      const agent = await database.get('SELECT provider_id FROM agents WHERE id = ?', [agentId])
      if (agent) {
        await database.run(
          'INSERT INTO cost_logs (id, run_id, provider_id, amount, currency, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
          [
            `cost_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            payload.runId,
            agent.provider_id,
            payload.cost,
            'USD',
            Math.floor(payload.timestamp.getTime() / 1000),
          ],
        )
      }
    }

    // Store webhook delivery record
    const payloadHash = Buffer.from(JSON.stringify(payload)).toString('hex')
    await database.run(
      'INSERT INTO webhooks (id, run_id, payload_hash, timestamp, delivery_status) VALUES (?, ?, ?, ?, ?)',
      [
        `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        payload.runId,
        payloadHash,
        Math.floor(payload.timestamp.getTime() / 1000),
        'success',
      ],
    )

    // Handle artifacts if provided
    if (payload.artifacts && payload.artifacts.length > 0) {
      for (const artifact of payload.artifacts) {
        // Store artifact metadata (actual files stored in working directory)
        // This is just for indexing/tracking
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Webhook processing error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Calculate total cost for a project
export async function getProjectCost(projectId: string): Promise<number> {
  try {
    const result = await database.get(
      `
      SELECT COALESCE(SUM(r.total_cost), 0) as total_cost
      FROM runs r
      JOIN tasks t ON r.task_id = t.id
      WHERE t.project_id = ?
    `,
      [projectId],
    )
    return result?.total_cost || 0
  } catch (error) {
    console.error('Error calculating project cost:', error)
    return 0
  }
}

// Calculate total cost for an agent
export async function getAgentCost(agentId: string): Promise<number> {
  try {
    const result = await database.get(
      'SELECT COALESCE(SUM(total_cost), 0) as total_cost FROM runs WHERE agent_id = ?',
      [agentId],
    )
    return result?.total_cost || 0
  } catch (error) {
    console.error('Error calculating agent cost:', error)
    return 0
  }
}

// Check if agent is over budget
export async function isAgentOverBudget(agentId: string): Promise<boolean> {
  try {
    const agent = await database.get(
      'SELECT cost_budget FROM agents WHERE id = ?',
      [agentId],
    )
    if (!agent) return false

    const totalCost = await getAgentCost(agentId)
    return totalCost >= agent.cost_budget
  } catch (error) {
    console.error('Error checking agent budget:', error)
    return false
  }
}
