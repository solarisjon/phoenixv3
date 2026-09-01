import { NextRequest, NextResponse } from 'next/server'
import { database, initializeDb } from '@/lib/db/client'
import { listSnapshots, restoreSnapshot } from '@/lib/recovery/snapshot'
import { createRetryRun } from '@/lib/retry/policy'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await initializeDb()
  try {
    const { id: runId } = params

    const run = await database.get(
      `SELECT r.*, t.name as task_name, a.name as agent_name, p.name as project_name
       FROM runs r
       JOIN tasks t ON r.task_id = t.id
       JOIN agents a ON r.agent_id = a.id
       JOIN projects p ON t.project_id = p.id
       WHERE r.id = ?`,
      [runId],
    )

    if (!run) {
      return NextResponse.json(
        { error: 'Run not found' },
        { status: 404 },
      )
    }

    // Fetch recovery snapshots for this run
    const snapshots = await listSnapshots(runId)

    return NextResponse.json({
      ...run,
      snapshots,
    })
  } catch (error) {
    console.error('Error fetching run:', error)
    return NextResponse.json(
      { error: 'Failed to fetch run' },
      { status: 500 },
    )
  }
}

// Resume a failed run from checkpoint
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: runId } = params
    const body = await req.json()
    const { action, snapshotId } = body

    if (action === 'resume') {
      if (!snapshotId) {
        return NextResponse.json(
          { error: 'snapshotId required for resume action' },
          { status: 400 },
        )
      }

      // Get snapshot
      const snapshot = await database.get(
        'SELECT * FROM recovery_snapshots WHERE id = ?',
        [snapshotId],
      )

      if (!snapshot) {
        return NextResponse.json(
          { error: 'Snapshot not found' },
          { status: 404 },
        )
      }

      // Get original run
      const originalRun = await database.get('SELECT * FROM runs WHERE id = ?', [runId])
      if (!originalRun) {
        return NextResponse.json(
          { error: 'Original run not found' },
          { status: 404 },
        )
      }

      // Get task and project for working directory
      const task = await database.get('SELECT * FROM tasks WHERE id = ?', [originalRun.task_id])
      const project = await database.get('SELECT * FROM projects WHERE id = ?', [task.project_id])

      // Restore snapshot
      await restoreSnapshot(snapshot.snapshot_dir, project.base_directory)

      // Create resume run (linked to original)
      const resumeRunId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const now = Math.floor(Date.now() / 1000)

      await database.run(
        `INSERT INTO runs (id, task_id, agent_id, status, original_run_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [resumeRunId, originalRun.task_id, originalRun.agent_id, 'pending', runId, now],
      )

      return NextResponse.json({
        id: resumeRunId,
        status: 'pending',
        message: 'Resume run created from snapshot',
      })
    } else if (action === 'retry') {
      // Create retry run
      const agent = await database.get(
        'SELECT * FROM agents WHERE id = (SELECT agent_id FROM runs WHERE id = ?)',
        [runId],
      )

      if (!agent) {
        return NextResponse.json(
          { error: 'Agent not found' },
          { status: 404 },
        )
      }

      const retryPolicy = JSON.parse(agent.retry_policy || '{}')
      const newRunId = await createRetryRun(runId, retryPolicy, database)

      return NextResponse.json({
        id: newRunId,
        status: 'pending',
        message: 'Retry run created',
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "resume" or "retry"' },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error('Error processing run action:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process action' },
      { status: 500 },
    )
  }
}
