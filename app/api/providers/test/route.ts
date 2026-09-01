import { NextRequest, NextResponse } from 'next/server'
import { database, initializeDb } from '@/lib/db/client'
import { callProvider } from '@/lib/providers/call'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  await initializeDb()
  try {
    const body = await req.json()
    const { providerId, type, config } = body

    if (!config) {
      return NextResponse.json(
        { error: 'config required' },
        { status: 400 },
      )
    }

    if (!config.apiKey) {
      return NextResponse.json(
        { error: 'API key required in config' },
        { status: 400 },
      )
    }

    // If providerId provided, try to get provider type from DB; otherwise use type from request
    let providerType = type

    if (providerId && providerId !== 'new') {
      const provider = await database.get(
        'SELECT type FROM providers WHERE id = ?',
        [providerId],
      )

      if (provider) {
        providerType = provider.type
      }
    }

    if (!providerType) {
      return NextResponse.json(
        { error: 'Provider type required' },
        { status: 400 },
      )
    }

    // Test based on provider type
    const testResult = await testProvider(providerType, config)

    if (testResult.success) {
      return NextResponse.json({
        success: true,
        message: testResult.message,
        model: testResult.model,
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: testResult.error,
        },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error('Provider test error:', error)
    return NextResponse.json(
      { error: 'Test failed', details: String(error) },
      { status: 500 },
    )
  }
}

async function testProvider(
  type: string,
  config: any,
): Promise<{ success: boolean; message?: string; model?: string; error?: string }> {
  const testPrompt = 'What is 2+2? Answer with just the number.'

  const result = await callProvider(type, config, { user: testPrompt })

  if (!result.success) {
    return { success: false, error: result.error }
  }

  const text = result.text || ''

  return {
    success: text.includes('4'),
    message: `Provider responded: "${text}"`,
    model: result.model,
  }
}
