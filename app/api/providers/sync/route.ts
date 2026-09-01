import { NextRequest, NextResponse } from 'next/server'
import { database, initializeDb } from '@/lib/db/client'
import { listPiTools, type PiTool } from '@/lib/providers/pi-harness'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  await initializeDb()
  try {
    const body = await req.json()
    const { providerId } = body

    if (!providerId) {
      return NextResponse.json(
        { error: 'providerId required' },
        { status: 400 },
      )
    }

    // Get provider from database
    const provider = await database.get(
      'SELECT id, type, config FROM providers WHERE id = ?',
      [providerId],
    )

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 },
      )
    }

    if (provider.type !== 'pi') {
      return NextResponse.json(
        { error: 'Only Pi providers support tool discovery' },
        { status: 400 },
      )
    }

    const config = JSON.parse(provider.config || '{}')
    const binaryPath = config.binaryPath || 'pi'

    // Fetch tools from pi
    let tools: PiTool[] = []
    try {
      tools = await listPiTools(binaryPath)
    } catch (e) {
      console.warn('Failed to fetch Pi tools:', e)
      // Return success with empty tools if discovery fails
    }

    // Register tools as provider-defined skills
    const now = Math.floor(Date.now() / 1000)
    let registeredCount = 0

    for (const tool of tools) {
      try {
        const skillId = `skill_pi_${tool.id}`

        // Check if skill already exists
        const existing = await database.get(
          'SELECT id FROM skills WHERE id = ?',
          [skillId],
        )

        if (!existing) {
          await database.run(
            `INSERT INTO skills (id, name, description, type, provider, config, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [skillId, tool.name, tool.description || '', 'provider-defined', 'pi', null, now],
          )
          registeredCount++
        }
      } catch (e) {
        console.warn(`Failed to register tool ${tool.name}:`, e)
      }
    }

    return NextResponse.json({
      success: true,
      totalTools: tools.length,
      registeredSkills: registeredCount,
      tools: tools,
    })
  } catch (error) {
    console.error('Provider sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync provider' },
      { status: 500 },
    )
  }
}
