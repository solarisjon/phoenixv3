import { NextRequest, NextResponse } from 'next/server'
import { database, initializeDb } from '@/lib/db/client'
import { callProvider } from '@/lib/providers/call'

export const dynamic = 'force-dynamic'

const SYSTEM_PROMPT = `You write agent personas for Phoenix, an AI agent orchestration platform. Given an agent name and optionally a rough draft or a few notes, produce a detailed persona description. This text is used VERBATIM as the system prompt sent to the provider on every task the agent runs, so write it directly to the agent ("You are...", "Your responsibilities include...").

Structure it clearly (e.g. core duties, key responsibilities, decision-making approach, working style) using markdown headers/bullets where useful. Be specific and concrete rather than generic. Output ONLY the persona text itself - no preamble like "Here's a description:", no surrounding quotes.`

export async function POST(req: NextRequest) {
  await initializeDb()
  try {
    const body = await req.json()
    const { providerId, name, draft } = body

    if (!providerId || !name) {
      return NextResponse.json(
        { error: 'providerId and name required' },
        { status: 400 },
      )
    }

    const provider = await database.get('SELECT * FROM providers WHERE id = ?', [providerId])
    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    }

    const config = JSON.parse(provider.config || '{}')
    const userPrompt = `Agent name: ${name}\n\n${
      draft && draft.trim()
        ? `Rough draft / notes to expand on:\n${draft}`
        : '(No draft provided - infer a sensible persona from the name alone.)'
    }`

    const result = await callProvider(
      provider.type,
      { apiKey: config.apiKey, endpoint: config.endpoint, model: config.model },
      { system: SYSTEM_PROMPT, user: userPrompt },
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Enhancement failed' }, { status: 400 })
    }

    return NextResponse.json({ description: result.text })
  } catch (error) {
    console.error('Error enhancing agent description:', error)
    return NextResponse.json({ error: 'Failed to enhance description' }, { status: 500 })
  }
}
