import { NextRequest, NextResponse } from 'next/server'
import { database, initializeDb } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  await initializeDb()
  try {
    const { searchParams } = new URL(req.url)
    const agentId = searchParams.get('agentId')

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId query parameter required' },
        { status: 400 },
      )
    }

    // Verify agent exists and get its details
    const agent = await database.get(
      `SELECT a.*, p.name as provider_name FROM agents a
       JOIN providers p ON a.provider_id = p.id
       WHERE a.id = ?`,
      [agentId],
    )

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 },
      )
    }

    // Get all pending tasks for this agent (enabled, no existing active runs)
    const pendingTasks = await database.all(
      `SELECT t.*, p.name as project_name, p.base_directory
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE t.agent_id = ? AND t.enabled = 1
         AND NOT EXISTS (
           SELECT 1 FROM runs r
           WHERE r.task_id = t.id AND r.status IN ('pending', 'running')
         )
       ORDER BY t.created_at ASC`,
      [agentId],
    )

    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        provider: agent.provider_name,
        model: agent.model,
      },
      tasks: pendingTasks.map((task: any) => ({
        id: task.id,
        name: task.name,
        description: task.description,
        project: {
          id: task.project_id,
          name: task.project_name,
          directory: task.base_directory,
        },
        createdAt: task.created_at,
      })),
      taskCount: pendingTasks.length,
    })
  } catch (error) {
    console.error('Error fetching agent tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agent tasks' },
      { status: 500 },
    )
  }
}
