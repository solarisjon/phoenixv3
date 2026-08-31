import { NextRequest, NextResponse } from 'next/server'
import { initializeDb, database } from '@/lib/db/client'
import {
  loadAllSkills,
  registerCustomSkill,
  allocateSkillToAgent,
  revokeSkillFromAgent,
} from '@/lib/skills/loader'

export async function GET(req: NextRequest) {
  await initializeDb()
  try {
    const { searchParams } = new URL(req.url)
    const agentId = searchParams.get('agentId')

    if (agentId) {
      // Get skills for a specific agent
      const skills = await loadAllSkills(agentId)
      return NextResponse.json(skills)
    }

    // Get all available skills
    const skills = await database.all(
      'SELECT * FROM skills ORDER BY type DESC, name ASC',
    )

    return NextResponse.json(
      skills.map((s: any) => ({
        ...s,
        config: s.config ? JSON.parse(s.config) : undefined,
      })),
    )
  } catch (error) {
    console.error('Error fetching skills:', error)
    return NextResponse.json(
      { error: 'Failed to fetch skills' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, name, description, provider, config } = body

    if (action === 'register') {
      if (!name || !provider) {
        return NextResponse.json(
          { error: 'Missing required fields: name, provider' },
          { status: 400 },
        )
      }

      const skill = await registerCustomSkill(
        name,
        description || '',
        provider,
        config,
      )

      return NextResponse.json(skill, { status: 201 })
    }

    if (action === 'allocate') {
      const { skillId, agentId } = body
      if (!skillId || !agentId) {
        return NextResponse.json(
          { error: 'Missing required fields: skillId, agentId' },
          { status: 400 },
        )
      }

      await allocateSkillToAgent(skillId, agentId)
      return NextResponse.json({ success: true })
    }

    if (action === 'revoke') {
      const { skillId, agentId } = body
      if (!skillId || !agentId) {
        return NextResponse.json(
          { error: 'Missing required fields: skillId, agentId' },
          { status: 400 },
        )
      }

      await revokeSkillFromAgent(skillId, agentId)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { error: 'Unknown action' },
      { status: 400 },
    )
  } catch (error) {
    console.error('Error processing skill action:', error)
    return NextResponse.json(
      { error: 'Failed to process action' },
      { status: 500 },
    )
  }
}
