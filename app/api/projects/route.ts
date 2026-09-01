import { NextRequest, NextResponse } from 'next/server'
import { database, initializeDb } from '@/lib/db/client'
import path from 'path'
import os from 'os'
import fs from 'fs'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  await initializeDb()
  try {
    const projects = await database.all('SELECT * FROM projects ORDER BY created_at DESC')
    return NextResponse.json(projects)
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  await initializeDb()
  try {
    const body = await req.json()
    const { name, description, baseDirectory } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 },
      )
    }

    // Working directory: user-specified (must be absolute, ~ expanded) or default under ~/.phoenix
    let projectDir: string
    if (baseDirectory) {
      const expanded = baseDirectory.startsWith('~')
        ? path.join(os.homedir(), baseDirectory.slice(1))
        : baseDirectory

      if (!path.isAbsolute(expanded)) {
        return NextResponse.json(
          { error: 'Working directory must be an absolute path (e.g. /Users/you/projects/my-project or ~/projects/my-project)' },
          { status: 400 },
        )
      }
      projectDir = expanded
    } else {
      const phoenixDir = path.join(os.homedir(), '.phoenix')
      projectDir = path.join(phoenixDir, name)
    }

    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true })
      // Create subdirectories
      fs.mkdirSync(path.join(projectDir, 'artifacts'), { recursive: true })
      fs.mkdirSync(path.join(projectDir, '.recovery'), { recursive: true })
      fs.mkdirSync(path.join(projectDir, 'logs'), { recursive: true })
      fs.mkdirSync(path.join(projectDir, '.config'), { recursive: true })
    }

    // Create project in database
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    await database.run(
      `INSERT INTO projects (id, name, description, base_directory, total_cost, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        projectId,
        name,
        description || '',
        projectDir,
        0,
        Math.floor(Date.now() / 1000),
        Math.floor(Date.now() / 1000),
      ],
    )

    return NextResponse.json(
      { id: projectId, name, description, baseDirectory: projectDir },
      { status: 201 },
    )
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 },
    )
  }
}
