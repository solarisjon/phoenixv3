import { NextRequest, NextResponse } from 'next/server'
import { database, initializeDb } from '@/lib/db/client'

initializeDb()

export async function GET(req: NextRequest) {
  try {
    const providers = await database.all(
      'SELECT id, name, type, description, available_models FROM providers ORDER BY name',
    )

    const parsedProviders = providers.map((p: any) => ({
      ...p,
      availableModels: JSON.parse(p.available_models || '[]'),
    }))

    return NextResponse.json(parsedProviders)
  } catch (error) {
    console.error('Error fetching providers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch providers' },
      { status: 500 },
    )
  }
}
