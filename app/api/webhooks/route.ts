import { NextRequest, NextResponse } from 'next/server'
import { database, initializeDb } from '@/lib/db/client'
import { verifyApiKey } from '@/lib/auth/keys'
import { processWebhook } from '@/lib/webhooks/processor'
import { extractApiKeyFromHeader } from '@/lib/auth/keys'

initializeDb()

export async function POST(req: NextRequest) {
  try {
    // Extract and verify API key
    const authHeader = req.headers.get('authorization')
    const apiKey = extractApiKeyFromHeader(authHeader)

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 },
      )
    }

    // Find agent by API key
    const apiKeyRecord = await database.get(
      'SELECT agent_id FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL',
      [require('crypto').createHash('sha256').update(apiKey).digest('hex')],
    )

    if (!apiKeyRecord) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 },
      )
    }

    const agentId = apiKeyRecord.agent_id

    // Parse webhook payload
    const body = await req.json()

    // Validate payload structure
    if (!body.runId || !body.status) {
      return NextResponse.json(
        { error: 'Missing required fields in webhook payload' },
        { status: 400 },
      )
    }

    // Process webhook
    const result = await processWebhook(agentId, {
      runId: body.runId,
      status: body.status,
      logs: body.logs || [],
      artifacts: body.artifacts || [],
      cost: body.cost || 0,
      timestamp: new Date(body.timestamp || Date.now()),
      agentState: body.agentState,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 },
    )
  }
}
