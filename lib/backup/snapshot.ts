import path from 'path'
import os from 'os'
import fs from 'fs'
import { execSync } from 'child_process'
import { logger } from '@/lib/logging/logger'

export interface BackupMetadata {
  id: string
  timestamp: string
  size: number
  dbSize: number
  workdirSize: number
  daysToKeep: number
}

// Create a full system backup
export async function createBackup(
  daysToKeep: number = 30,
): Promise<{ backupPath: string; metadata: BackupMetadata }> {
  try {
    const phoenixDir = path.join(os.homedir(), '.phoenix')
    const backupsDir = path.join(phoenixDir, 'backups')

    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true })
    }

    const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const backupDir = path.join(backupsDir, backupId)
    const tarPath = `${backupDir}.tar.gz`

    fs.mkdirSync(backupDir, { recursive: true })

    // Copy database
    const dbPath = path.join(phoenixDir, 'phoenix.db')
    const dbBackupPath = path.join(backupDir, 'phoenix.db')

    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, dbBackupPath)
    }

    // Get sizes
    const dbSize = fs.existsSync(dbBackupPath)
      ? fs.statSync(dbBackupPath).size
      : 0

    // Calculate working directory size
    const projectsDir = phoenixDir
    const workdirSize = calculateDirSize(projectsDir)

    // Create tar.gz
    const tarCommand = `tar -czf "${tarPath}" -C "${phoenixDir}" "${backupId}"`
    execSync(tarCommand, { stdio: 'pipe' })

    // Clean up temp backup dir
    fs.rmSync(backupDir, { recursive: true })

    const totalSize = fs.statSync(tarPath).size

    const metadata: BackupMetadata = {
      id: backupId,
      timestamp: new Date().toISOString(),
      size: totalSize,
      dbSize,
      workdirSize,
      daysToKeep,
    }

    // Save metadata
    const metadataPath = `${tarPath}.json`
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2))

    logger.info('Backup created', { backupId, size: totalSize })

    return { backupPath: tarPath, metadata }
  } catch (error) {
    logger.error('Failed to create backup', error)
    throw error
  }
}

// Restore from backup
export async function restoreBackup(backupPath: string): Promise<void> {
  try {
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`)
    }

    const phoenixDir = path.join(os.homedir(), '.phoenix')

    // Extract tar.gz
    const extractCommand = `tar -xzf "${backupPath}" -C "${phoenixDir}"`
    execSync(extractCommand, { stdio: 'pipe' })

    logger.info('Backup restored', { backupPath })
  } catch (error) {
    logger.error('Failed to restore backup', error)
    throw error
  }
}

// List available backups
export function listBackups(): BackupMetadata[] {
  try {
    const phoenixDir = path.join(os.homedir(), '.phoenix')
    const backupsDir = path.join(phoenixDir, 'backups')

    if (!fs.existsSync(backupsDir)) {
      return []
    }

    const files = fs.readdirSync(backupsDir)
    const backups: BackupMetadata[] = []

    for (const file of files) {
      if (file.endsWith('.tar.gz.json')) {
        const metadataPath = path.join(backupsDir, file)
        const content = fs.readFileSync(metadataPath, 'utf-8')
        const metadata = JSON.parse(content)
        backups.push(metadata)
      }
    }

    return backups.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
  } catch (error) {
    logger.error('Error listing backups', error)
    return []
  }
}

// Delete a backup
export function deleteBackup(backupId: string): void {
  try {
    const phoenixDir = path.join(os.homedir(), '.phoenix')
    const backupsDir = path.join(phoenixDir, 'backups')

    const tarPath = path.join(backupsDir, `${backupId}.tar.gz`)
    const metadataPath = `${tarPath}.json`

    if (fs.existsSync(tarPath)) {
      fs.unlinkSync(tarPath)
    }

    if (fs.existsSync(metadataPath)) {
      fs.unlinkSync(metadataPath)
    }

    logger.info('Backup deleted', { backupId })
  } catch (error) {
    logger.error('Error deleting backup', error)
  }
}

// Clean up old backups based on retention policy
export function cleanupOldBackups(): void {
  try {
    const backups = listBackups()
    const now = Date.now()

    for (const backup of backups) {
      const backupDate = new Date(backup.timestamp).getTime()
      const ageMs = now - backupDate
      const ageDays = ageMs / (1000 * 60 * 60 * 24)

      if (ageDays > backup.daysToKeep) {
        deleteBackup(backup.id)
      }
    }
  } catch (error) {
    logger.error('Error cleaning up old backups', error)
  }
}

// Calculate directory size recursively
function calculateDirSize(dirPath: string): number {
  try {
    if (!fs.existsSync(dirPath)) {
      return 0
    }

    let size = 0
    const files = fs.readdirSync(dirPath)

    for (const file of files) {
      if (file === 'backups' || file === '.recovery') {
        continue // Skip backup directories
      }

      const filePath = path.join(dirPath, file)
      const stat = fs.statSync(filePath)

      if (stat.isDirectory()) {
        size += calculateDirSize(filePath)
      } else {
        size += stat.size
      }
    }

    return size
  } catch (error) {
    logger.error('Error calculating directory size', error)
    return 0
  }
}
