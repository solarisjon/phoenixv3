import { NextRequest, NextResponse } from 'next/server'
import { database, initializeDb } from '@/lib/db/client'
import { scheduleTask, parseCronExpression, triggerTaskRun } from '@/lib/scheduler/engine'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  await initializeDb()
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId query parameter required' },
        { status: 400 },
      )
    }

    const tasks = await database.all(
      `SELECT t.*, a.name as agent_name
       FROM tasks t
       JOIN agents a ON t.agent_id = a.id
       WHERE t.project_id = ?
       ORDER BY t.created_at DESC`,
      [projectId],
    )

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  await initializeDb()
  try {
    const body = await req.json()
    const { projectId, name, description, agentId, scheduleCron, command } = body

    if (!projectId || !name || !agentId) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, name, agentId' },
        { status: 400 },
      )
    }

    // Verify project exists
    const project = await database.get('SELECT * FROM projects WHERE id = ?', [projectId])
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 },
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

    // Create task
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = Math.floor(Date.now() / 1000)
    // Tasks are enabled by default (can be manually triggered)
    // If scheduleCron is provided, it will run on schedule
    const enabled = true

    await database.run(
      `INSERT INTO tasks (id, project_id, name, description, agent_id, schedule_cron, command, enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [taskId, projectId, name, description || '', agentId, scheduleCron || null, command, enabled, now, now],
    )

    // Schedule if cron provided
    if (scheduleCron) {
      const validCron = parseCronExpression(scheduleCron)
      await scheduleTask(taskId, validCron)
    }

    // Auto-trigger run only for command-based tasks (agent tasks wait for pickup)
    if (command && !scheduleCron) {
      try {
        const runId = await triggerTaskRun(taskId)
        console.log(`Auto-triggered run ${runId} for task ${taskId}`)
      } catch (err) {
        console.error('Failed to auto-trigger run:', err)
      }
    }

    return NextResponse.json(
      {
        id: taskId,
        name,
        description,
        agentId,
        scheduleCron,
        enabled,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 },
    )
  }
}
