import { NextRequest, NextResponse } from 'next/server'
import { database, initializeDb } from '@/lib/db/client'
import { builtInProviders } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  await initializeDb()
  try {
    const body = await req.json()
    const { name, type, apiKey, endpoint, model } = body

    if (!name || !type) {
      return NextResponse.json(
        { error: 'name and type required' },
        { status: 400 },
      )
    }

    const providerId = `provider_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = Math.floor(Date.now() / 1000)

    // Build config object
    const config: any = {
      apiKey: apiKey || '',
      model: model || '',
    }

    if (type === 'openai-compat') {
      config.endpoint = endpoint || ''
    }

    // Store as JSON
    const configJson = JSON.stringify(config)

    // Known model list per provider type (same source the old auto-seed used)
    const availableModels = builtInProviders.find((p) => p.type === type)?.availableModels || []
    const availableModelsJson = JSON.stringify(availableModels)

    await database.run(
      `INSERT INTO providers (id, name, type, config, available_models, is_configured, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [providerId, name, type, configJson, availableModelsJson, 1, now, now],
    )

    return NextResponse.json(
      {
        id: providerId,
        name,
        type,
        model: config.model,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Provider configuration error:', error)
    return NextResponse.json(
      { error: 'Failed to configure provider' },
      { status: 500 },
    )
  }
}
