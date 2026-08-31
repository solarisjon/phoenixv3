import { NextRequest, NextResponse } from 'next/server'
import { database, initializeDb } from '@/lib/db/client'
import { triggerTaskRun } from '@/lib/scheduler/engine'
import { listSnapshots } from '@/lib/recovery/snapshot'

initializeDb()

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const taskId = searchParams.get('taskId')

    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId query parameter required' },
        { status: 400 },
      )
    }

    const runs = await database.all(
      `SELECT r.*, t.name as task_name, a.name as agent_name
       FROM runs r
       JOIN tasks t ON r.task_id = t.id
       JOIN agents a ON r.agent_id = a.id
       WHERE r.task_id = ?
       ORDER BY r.created_at DESC`,
      [taskId],
    )

    return NextResponse.json(runs)
  } catch (error) {
    console.error('Error fetching runs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch runs' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { taskId } = body

    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId required' },
        { status: 400 },
      )
    }

    // Trigger run
    const runId = await triggerTaskRun(taskId)

    return NextResponse.json(
      { id: runId, status: 'pending' },
      { status: 201 },
    )
  } catch (error) {
    console.error('Error creating run:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create run' },
      { status: 500 },
    )
  }
}
