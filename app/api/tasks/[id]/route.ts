import { NextRequest, NextResponse } from 'next/server'
import { database, initializeDb } from '@/lib/db/client'
import { scheduleTask, stopTask, parseCronExpression } from '@/lib/scheduler/engine'

export const dynamic = 'force-dynamic'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  await initializeDb()
  try {
    const { id } = params
    const body = await req.json()
    const { name, description, agentId, scheduleCron, command } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Task ID required' },
        { status: 400 },
      )
    }

    const existing = await database.get('SELECT * FROM tasks WHERE id = ?', [id])
    if (!existing) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 },
      )
    }

    if (!name || !agentId) {
      return NextResponse.json(
        { error: 'Missing required fields: name, agentId' },
        { status: 400 },
      )
    }

    const agent = await database.get('SELECT * FROM agents WHERE id = ?', [agentId])
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 },
      )
    }

    const now = Math.floor(Date.now() / 1000)

    await database.run(
      `UPDATE tasks SET name = ?, description = ?, agent_id = ?, schedule_cron = ?, command = ?, updated_at = ? WHERE id = ?`,
      [name, description || '', agentId, scheduleCron || null, command || null, now, id],
    )

    // Re-sync the cron schedule to match the edited task
    if (scheduleCron) {
      const validCron = parseCronExpression(scheduleCron)
      await scheduleTask(id, validCron)
    } else if (existing.schedule_cron) {
      stopTask(id)
    }

    return NextResponse.json({
      id,
      name,
      description,
      agentId,
      scheduleCron,
      command,
    })
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 },
    )
  }
}
