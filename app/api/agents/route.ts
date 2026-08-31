import { NextRequest, NextResponse } from 'next/server'
import { database, initializeDb } from '@/lib/db/client'
import { generateApiKey } from '@/lib/auth/keys'

export async function GET(_req: NextRequest) {
  await initializeDb()
  try {
    const agents = await database.all(
      `SELECT a.*, p.name as provider_name, p.type as provider_type
       FROM agents a
       JOIN providers p ON a.provider_id = p.id
       ORDER BY a.created_at DESC`,
    )

    // Remove password hashes from response
    return NextResponse.json(
      agents.map((a: any) => ({
        ...a,
        apiKeyHash: undefined,
      })),
    )
  } catch (error) {
    console.error('Error fetching agents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  await initializeDb()
  try {
    const body = await req.json()
    const { name, description, providerId, model, costBudget } = body

    if (!name || !providerId || !model) {
      return NextResponse.json(
        { error: 'Missing required fields: name, providerId, model' },
        { status: 400 },
      )
    }

    // Verify provider exists
    const provider = await database.get('SELECT * FROM providers WHERE id = ?', [providerId])
    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 },
      )
    }

    // Verify model is available for provider
    const availableModels = JSON.parse(provider.available_models || '[]')
    if (availableModels.length > 0 && !availableModels.includes(model)) {
      return NextResponse.json(
        { error: `Model ${model} not available for provider ${provider.name}` },
        { status: 400 },
      )
    }

    // Generate API key
    const { key, hash } = generateApiKey()

    // Create agent in database
    const agentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = Math.floor(Date.now() / 1000)

    await database.run(
      `INSERT INTO agents (id, name, description, provider_id, model, cost_budget, api_key_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        agentId,
        name,
        description || '',
        providerId,
        model,
        costBudget || 1000,
        hash,
        now,
        now,
      ],
    )

    // Create initial API key record
    const keyId = `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    await database.run(
      `INSERT INTO api_keys (id, agent_id, key_hash, created_at)
       VALUES (?, ?, ?, ?)`,
      [keyId, agentId, hash, now],
    )

    return NextResponse.json(
      {
        id: agentId,
        name,
        description,
        providerId,
        model,
        costBudget,
        apiKey: key, // Return key only once during creation
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Error creating agent:', error)
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 },
    )
  }
}
