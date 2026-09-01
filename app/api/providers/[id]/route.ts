import { NextRequest, NextResponse } from 'next/server'
import { database, initializeDb } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  await initializeDb()
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'Provider ID required' },
        { status: 400 },
      )
    }

    const result = await database.run('DELETE FROM providers WHERE id = ?', [id])

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Provider delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete provider' },
      { status: 500 },
    )
  }
}
