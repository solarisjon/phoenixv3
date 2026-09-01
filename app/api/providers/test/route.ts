import { NextRequest, NextResponse } from 'next/server'
import { database, initializeDb } from '@/lib/db/client'

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

  switch (type) {
    case 'claude-code':
      return testClaudeProvider(config, testPrompt)
    case 'openai-compat':
      return testOpenAIProvider(config, testPrompt)
    case 'pi':
      return testPiProvider(config, testPrompt)
    default:
      return { success: false, error: `Unsupported provider type: ${type}` }
  }
}

async function testClaudeProvider(config: any, prompt: string) {
  try {
    if (!config.apiKey) {
      return { success: false, error: 'API key required' }
    }

    const model = config.model || 'claude-opus-5'

    // Test Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 100,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return {
        success: false,
        error: error.error?.message || 'Claude API error',
      }
    }

    const data = await response.json()
    const result = data.content?.[0]?.text || ''

    return {
      success: result.includes('4'),
      message: `Claude responded: "${result}"`,
      model,
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

async function testOpenAIProvider(config: any, prompt: string) {
  try {
    if (!config.apiKey || !config.endpoint) {
      return { success: false, error: 'API key and endpoint required' }
    }

    const model = config.model || 'gpt-4'

    // Test OpenAI-compatible endpoint
    const endpoint = config.endpoint.replace(/\/$/, '') // Remove trailing slash
    const response = await fetch(`${endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return {
        success: false,
        error: error.error?.message || 'OpenAI API error',
      }
    }

    const data = await response.json()
    const result = data.choices?.[0]?.message?.content || ''

    return {
      success: result.includes('4'),
      message: `OpenAI responded: "${result}"`,
      model,
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

async function testPiProvider(config: any, _prompt: string) {
  try {
    if (!config.apiKey) {
      return { success: false, error: 'API key required' }
    }

    // Placeholder for Pi API test
    return {
      success: false,
      error: 'Pi provider not yet implemented',
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}
