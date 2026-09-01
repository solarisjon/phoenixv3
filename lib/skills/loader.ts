import path from 'path'
import os from 'os'
import fs from 'fs'
import { database } from '@/lib/db/client'

export interface SkillDefinition {
  id: string
  name: string
  description?: string
  version: string
  type: 'provider-defined' | 'custom'
  provider: string
  config?: Record<string, unknown>
  createdAt: Date
}

// Load all available skills (provider + custom)
export async function loadAllSkills(agentId: string): Promise<SkillDefinition[]> {
  try {
    // Get provider-defined skills
    const agent = await database.get(
      'SELECT provider_id FROM agents WHERE id = ?',
      [agentId],
    )

    if (!agent) {
      return []
    }

    // Get skills assigned to this agent
    const skills = await database.all(
      `SELECT s.* FROM skills s
       JOIN agent_skills ast ON s.id = ast.skill_id
       WHERE ast.agent_id = ?
       ORDER BY s.type DESC, s.name ASC`,
      [agentId],
    )

    return skills.map((s: any) => ({
      ...s,
      config: s.config ? JSON.parse(s.config) : undefined,
    }))
  } catch (error) {
    console.error('Error loading skills:', error)
    return []
  }
}

// Register a custom skill
export async function registerCustomSkill(
  name: string,
  description: string,
  provider: string,
  config?: Record<string, unknown>,
): Promise<SkillDefinition> {
  try {
    const skillId = `skill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = Math.floor(Date.now() / 1000)

    await database.run(
      `INSERT INTO skills (id, name, description, type, provider, config, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [skillId, name, description, 'custom', provider, config ? JSON.stringify(config) : null, now],
    )

    return {
      id: skillId,
      name,
      description,
      version: '1.0.0',
      type: 'custom',
      provider,
      config,
      createdAt: new Date(),
    }
  } catch (error) {
    console.error('Error registering skill:', error)
    throw error
  }
}

// Load custom skills from filesystem
export async function loadCustomSkillsFromDisk(): Promise<SkillDefinition[]> {
  try {
    const skillsDir = path.join(os.homedir(), '.config', 'phoenixv3', 'skills')

    if (!fs.existsSync(skillsDir)) {
      return []
    }

    const skills: SkillDefinition[] = []
    const files = fs.readdirSync(skillsDir)

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(skillsDir, file)
        const content = fs.readFileSync(filePath, 'utf-8')
        const skillDef = JSON.parse(content)

        skills.push({
          id: skillDef.id || file.replace('.json', ''),
          name: skillDef.name,
          description: skillDef.description,
          version: skillDef.version || '1.0.0',
          type: 'custom',
          provider: skillDef.provider || 'custom',
          config: skillDef.config,
          createdAt: new Date(fs.statSync(filePath).mtime),
        })
      }
    }

    return skills
  } catch (error) {
    console.error('Error loading custom skills from disk:', error)
    return []
  }
}

// Export skill to file
export async function exportSkillToFile(
  skill: SkillDefinition,
): Promise<string> {
  try {
    const skillsDir = path.join(os.homedir(), '.config', 'phoenixv3', 'skills')

    if (!fs.existsSync(skillsDir)) {
      fs.mkdirSync(skillsDir, { recursive: true })
    }

    const filePath = path.join(skillsDir, `${skill.name.toLowerCase().replace(/\s+/g, '-')}.json`)

    fs.writeFileSync(
      filePath,
      JSON.stringify(skill, null, 2),
    )

    return filePath
  } catch (error) {
    console.error('Error exporting skill:', error)
    throw error
  }
}

// Delete a skill
export async function deleteSkill(skillId: string): Promise<void> {
  try {
    await database.run(
      'DELETE FROM agent_skills WHERE skill_id = ?',
      [skillId],
    )

    await database.run(
      'DELETE FROM skills WHERE id = ?',
      [skillId],
    )
  } catch (error) {
    console.error('Error deleting skill:', error)
    throw error
  }
}

// Allocate skill to agent
export async function allocateSkillToAgent(
  skillId: string,
  agentId: string,
): Promise<void> {
  try {
    const now = Math.floor(Date.now() / 1000)

    await database.run(
      `INSERT OR IGNORE INTO agent_skills (agent_id, skill_id, assigned_at)
       VALUES (?, ?, ?)`,
      [agentId, skillId, now],
    )
  } catch (error) {
    console.error('Error allocating skill:', error)
    throw error
  }
}

// Revoke skill from agent
export async function revokeSkillFromAgent(
  skillId: string,
  agentId: string,
): Promise<void> {
  try {
    await database.run(
      'DELETE FROM agent_skills WHERE agent_id = ? AND skill_id = ?',
      [agentId, skillId],
    )
  } catch (error) {
    console.error('Error revoking skill:', error)
    throw error
  }
}
