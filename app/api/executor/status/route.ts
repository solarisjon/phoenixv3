import { NextRequest, NextResponse } from 'next/server'
import { initializeDb } from '@/lib/db/client'
import { isTaskExecutorRunning, startTaskExecutor } from '@/lib/executor/engine'

export async function GET(_req: NextRequest) {
  await initializeDb()

  // Start executor if not running
  if (!isTaskExecutorRunning()) {
    startTaskExecutor(2000) // Poll every 2 seconds
  }

  return NextResponse.json({
    running: isTaskExecutorRunning(),
    message: 'Task executor is active',
  })
}
