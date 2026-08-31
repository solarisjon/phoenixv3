import { NextRequest, NextResponse } from 'next/server'
import { initializeDb } from '@/lib/db/client'
import { listBackups, createBackup, restoreBackup } from '@/lib/backup/snapshot'
import { logger, exportLogs, initializeLogger } from '@/lib/logging/logger'
import path from 'path'
import os from 'os'

export async function GET(req: NextRequest) {
  await initializeDb()
  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')

    if (action === 'backups') {
      const backups = listBackups()
      return NextResponse.json({ backups })
    }

    if (action === 'logs') {
      const logsDir = path.join(os.homedir(), '.phoenix', 'logs')
      const logs = exportLogs(logsDir)
      return NextResponse.json({ logs, count: logs.length })
    }

    // Return general settings
    return NextResponse.json({
      features: {
        plugins: true,
        customSkills: true,
        recovery: true,
        backups: true,
        logging: true,
      },
    })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, backupId, daysToKeep } = body

    if (action === 'create-backup') {
      const result = await createBackup(daysToKeep || 30)
      return NextResponse.json(
        { success: true, backup: result.metadata },
        { status: 201 },
      )
    }

    if (action === 'restore-backup') {
      if (!backupId) {
        return NextResponse.json(
          { error: 'backupId required' },
          { status: 400 },
        )
      }

      const backupsDir = path.join(os.homedir(), '.phoenix', 'backups')
      const backupPath = path.join(backupsDir, `${backupId}.tar.gz`)

      await restoreBackup(backupPath)
      return NextResponse.json({ success: true })
    }

    if (action === 'set-log-level') {
      const { level } = body
      if (!['DEBUG', 'INFO', 'WARN', 'ERROR'].includes(level)) {
        return NextResponse.json(
          { error: 'Invalid log level' },
          { status: 400 },
        )
      }

      const logsDir = path.join(os.homedir(), '.phoenix', 'logs')
      initializeLogger(level, logsDir)

      logger.info('Log level changed', { level })
      return NextResponse.json({ success: true, level })
    }

    return NextResponse.json(
      { error: 'Unknown action' },
      { status: 400 },
    )
  } catch (error) {
    console.error('Error processing settings action:', error)
    return NextResponse.json(
      { error: 'Failed to process action' },
      { status: 500 },
    )
  }
}
