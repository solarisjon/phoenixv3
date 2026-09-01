import { NextRequest, NextResponse } from 'next/server'
import { database, initializeDb } from '@/lib/db/client'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; filename: string } },
) {
  await initializeDb()
  try {
    const { id: runId, filename } = params

    const run = await database.get(
      `SELECT r.id, p.base_directory
       FROM runs r
       JOIN tasks t ON r.task_id = t.id
       JOIN projects p ON t.project_id = p.id
       WHERE r.id = ?`,
      [runId],
    )

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    // Strip any directory components - artifacts only ever live directly in base_directory
    const safeName = path.basename(decodeURIComponent(filename))
    const filePath = path.join(run.base_directory, safeName)

    if (path.dirname(filePath) !== path.normalize(run.base_directory) || !fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Artifact not found' }, { status: 404 })
    }

    const content = fs.readFileSync(filePath)
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `inline; filename="${safeName}"`,
      },
    })
  } catch (error) {
    console.error('Error serving artifact:', error)
    return NextResponse.json({ error: 'Failed to serve artifact' }, { status: 500 })
  }
}
