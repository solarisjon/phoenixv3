import { NextRequest, NextResponse } from 'next/server'
import { database, initializeDb } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  await initializeDb()
  try {
    const body = await req.json()
    const { agentId, taskId } = body

    if (!agentId || !taskId) {
      return NextResponse.json(
        { error: 'Missing required fields: agentId, taskId' },
        { status: 400 },
      )
    }

    // Verify agent exists
    const agent = await database.get('SELECT * FROM agents WHERE id = ?', [agentId])
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 },
      )
    }

    // Verify task exists and belongs to this agent
    const task = await database.get(
      'SELECT * FROM tasks WHERE id = ? AND agent_id = ?',
      [taskId, agentId],
    )

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found or does not belong to this agent' },
        { status: 404 },
      )
    }

    // Check if agent is over budget
    const agentCostResult = await database.get(
      'SELECT COALESCE(SUM(total_cost), 0) as total_cost FROM runs WHERE agent_id = ?',
      [agentId],
    )

    if (agentCostResult.total_cost >= agent.cost_budget) {
      return NextResponse.json(
        { error: `Agent budget exceeded: $${agentCostResult.total_cost} >= $${agent.cost_budget}` },
        { status: 429 },
      )
    }

    // Check if there's already an active run for this task
    const existingRun = await database.get(
      `SELECT * FROM runs WHERE task_id = ? AND status IN ('pending', 'running')`,
      [taskId],
    )

    if (existingRun) {
      return NextResponse.json(
        { error: 'Task already has an active run', runId: existingRun.id },
        { status: 409 },
      )
    }

    // Create a new run for this task (agent claims it)
    const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = Math.floor(Date.now() / 1000)

    await database.run(
      `INSERT INTO runs (id, task_id, agent_id, status, started_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [runId, taskId, agentId, 'running', now, now],
    )

    return NextResponse.json(
      {
        runId,
        taskId,
        taskName: task.name,
        taskDescription: task.description,
        status: 'running',
        startedAt: now,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Error claiming task:', error)
    return NextResponse.json(
      { error: 'Failed to claim task' },
      { status: 500 },
    )
  }
}
