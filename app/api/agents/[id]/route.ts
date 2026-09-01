import { NextRequest, NextResponse } from 'next/server'
import { database, initializeDb } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  await initializeDb()
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'Agent ID required' },
        { status: 400 },
      )
    }

    const agent = await database.get(
      'SELECT id, name, description, provider_id, model, cost_budget, cost_budget_currency FROM agents WHERE id = ?',
      [id],
    )

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      providerId: agent.provider_id,
      model: agent.model,
      costBudget: agent.cost_budget,
      costBudgetCurrency: agent.cost_budget_currency,
    })
  } catch (error) {
    console.error('Agent fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agent' },
      { status: 500 },
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  await initializeDb()
  try {
    const { id } = params
    const body = await req.json()
    const { name, description, providerId, model, costBudget, costBudgetCurrency } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Agent ID required' },
        { status: 400 },
      )
    }

    if (!name) {
      return NextResponse.json(
        { error: 'name required' },
        { status: 400 },
      )
    }

    const now = Math.floor(Date.now() / 1000)

    await database.run(
      `UPDATE agents SET name = ?, description = ?, provider_id = ?, model = ?, cost_budget = ?, cost_budget_currency = ?, updated_at = ? WHERE id = ?`,
      [
        name,
        description || null,
        providerId,
        model,
        costBudget || 1000,
        costBudgetCurrency || 'USD',
        now,
        id,
      ],
    )

    return NextResponse.json({
      id,
      name,
      description,
      providerId,
      model,
      costBudget,
      costBudgetCurrency,
    })
  } catch (error) {
    console.error('Agent update error:', error)
    return NextResponse.json(
      { error: 'Failed to update agent' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  await initializeDb()
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'Agent ID required' },
        { status: 400 },
      )
    }

    const result = await database.run('DELETE FROM agents WHERE id = ?', [id])

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Agent delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete agent' },
      { status: 500 },
    )
  }
}
