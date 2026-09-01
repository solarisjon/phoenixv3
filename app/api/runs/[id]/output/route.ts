import { NextRequest, NextResponse } from 'next/server'
import { database, initializeDb } from '@/lib/db/client'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  await initializeDb()
  try {
    const { id: runId } = params

    // Get run details with project directory
    const run = await database.get(
      `SELECT r.*, t.name as task_name, p.base_directory
       FROM runs r
       JOIN tasks t ON r.task_id = t.id
       JOIN projects p ON t.project_id = p.id
       WHERE r.id = ?`,
      [runId]
    )

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    // Read execution log file
    const logFile = path.join(run.base_directory, 'logs', `${runId}.log`)
    let logs = ''
    if (fs.existsSync(logFile)) {
      logs = fs.readFileSync(logFile, 'utf-8')
    }

    // Scan for artifacts in working directory
    const artifacts: Array<{
      name: string
      size: number
      created: number
      path: string
    }> = []

    try {
      const files = fs.readdirSync(run.base_directory)
      for (const file of files) {
        if (file !== 'logs' && file !== 'artifacts' && file !== '.recovery' && file !== '.config') {
          const filePath = path.join(run.base_directory, file)
          const stat = fs.statSync(filePath)
          if (stat.isFile()) {
            artifacts.push({
              name: file,
              size: stat.size,
              created: Math.floor(stat.mtime.getTime() / 1000),
              path: filePath,
            })
          }
        }
      }
    } catch (e) {
      console.error('Failed to scan artifacts:', e)
    }

    return NextResponse.json({
      runId,
      taskName: run.task_name,
      status: run.status,
      logs,
      artifacts,
      projectDirectory: run.base_directory,
      totalCost: run.total_cost,
      createdAt: run.created_at,
      endedAt: run.ended_at,
    })
  } catch (error) {
    console.error('Error fetching run output:', error)
    return NextResponse.json(
      { error: 'Failed to fetch run output' },
      { status: 500 }
    )
  }
}
