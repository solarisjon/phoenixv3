import { NextRequest, NextResponse } from 'next/server'
import { database, initializeDb } from '@/lib/db/client'

export async function GET(_req: NextRequest) {
  await initializeDb()
  try {
    const providers = await database.all(
      'SELECT id, name, type, description, available_models, config, is_configured FROM providers ORDER BY name',
    )

    const parsedProviders = providers.map((p: any) => {
      const config = p.config ? JSON.parse(p.config) : {}
      return {
        id: p.id,
        name: p.name,
        type: p.type,
        description: p.description,
        isConfigured: p.is_configured === 1,
        availableModels: JSON.parse(p.available_models || '[]'),
        apiKey: config.apiKey ? '••••••••' : undefined,
        endpoint: config.endpoint,
        model: config.model,
      }
    })

    return NextResponse.json(parsedProviders)
  } catch (error) {
    console.error('Error fetching providers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch providers' },
      { status: 500 },
    )
  }
}
