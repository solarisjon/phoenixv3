import { NextRequest, NextResponse } from 'next/server'
import { database, initializeDb } from '@/lib/db/client'
import path from 'path'
import os from 'os'
import fs from 'fs'

// Initialize DB on module load
initializeDb()

export async function GET(req: NextRequest) {
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
  try {
    const body = await req.json()
    const { name, description } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 },
      )
    }

    // Create working directory
    const phoenixDir = path.join(os.homedir(), '.phoenix')
    const projectDir = path.join(phoenixDir, name)

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
