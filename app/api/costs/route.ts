import { NextRequest, NextResponse } from 'next/server'
import { initializeDb } from '@/lib/db/client'
import {
  getTotalSystemCost,
  getCostByProvider,
  getCostByAgent,
  getCostByProject,
  getCostTrend,
} from '@/lib/cost/calculator'

initializeDb()

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const breakdown = searchParams.get('breakdown')

    const totalCost = await getTotalSystemCost()

    if (breakdown === 'provider') {
      const byProvider = await getCostByProvider()
      return NextResponse.json({ totalCost, breakdown: byProvider })
    }

    if (breakdown === 'agent') {
      const byAgent = await getCostByAgent()
      return NextResponse.json({ totalCost, breakdown: byAgent })
    }

    if (breakdown === 'project') {
      const byProject = await getCostByProject()
      return NextResponse.json({ totalCost, breakdown: byProject })
    }

    if (breakdown === 'trend') {
      const trend = await getCostTrend()
      return NextResponse.json({ totalCost, trend })
    }

    return NextResponse.json({ totalCost })
  } catch (error) {
    console.error('Error fetching cost data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cost data' },
      { status: 500 },
    )
  }
}
