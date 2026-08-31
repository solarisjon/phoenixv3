import path from 'path'
import os from 'os'
import fs from 'fs'
import { database } from '@/lib/db/client'

// Create a recovery snapshot when a run fails
export async function createRecoverySnapshot(
  runId: string,
  projectWorkingDir: string,
  stateMetadata?: Record<string, unknown>,
): Promise<string> {
  try {
    // Create snapshot directory
    const snapshotDir = path.join(projectWorkingDir, '.recovery', runId)

    if (!fs.existsSync(snapshotDir)) {
      fs.mkdirSync(snapshotDir, { recursive: true })
    }

    // Copy current working directory state to snapshot
    const sourceDir = projectWorkingDir
    const artifactsDir = path.join(sourceDir, 'artifacts')
    const configDir = path.join(sourceDir, '.config')

    if (fs.existsSync(artifactsDir)) {
      copyDirRecursive(artifactsDir, path.join(snapshotDir, 'artifacts'))
    }

    if (fs.existsSync(configDir)) {
      copyDirRecursive(configDir, path.join(snapshotDir, '.config'))
    }

    // Store metadata
    const metadata = {
      runId,
      snapshotTime: new Date().toISOString(),
      projectDir: projectWorkingDir,
      ...stateMetadata,
    }

    fs.writeFileSync(
      path.join(snapshotDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2),
    )

    // Record in database
    const snapshotId = `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = Math.floor(Date.now() / 1000)

    await database.run(
      `INSERT INTO recovery_snapshots (id, run_id, snapshot_dir, state_metadata, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [snapshotId, runId, snapshotDir, JSON.stringify(metadata), now],
    )

    console.log(`Created recovery snapshot for run ${runId} at ${snapshotDir}`)
    return snapshotDir
  } catch (error) {
    console.error('Error creating recovery snapshot:', error)
    throw error
  }
}

// Restore a snapshot for resume
export async function restoreSnapshot(
  snapshotDir: string,
  targetDir: string,
): Promise<void> {
  try {
    const artifactsSource = path.join(snapshotDir, 'artifacts')
    const configSource = path.join(snapshotDir, '.config')

    const artifactsTarget = path.join(targetDir, 'artifacts')
    const configTarget = path.join(targetDir, '.config')

    // Restore artifacts
    if (fs.existsSync(artifactsSource)) {
      if (fs.existsSync(artifactsTarget)) {
        fs.rmSync(artifactsTarget, { recursive: true })
      }
      copyDirRecursive(artifactsSource, artifactsTarget)
    }

    // Restore config
    if (fs.existsSync(configSource)) {
      if (fs.existsSync(configTarget)) {
        fs.rmSync(configTarget, { recursive: true })
      }
      copyDirRecursive(configSource, configTarget)
    }

    console.log(`Restored snapshot from ${snapshotDir} to ${targetDir}`)
  } catch (error) {
    console.error('Error restoring snapshot:', error)
    throw error
  }
}

// List available snapshots for a run
export async function listSnapshots(runId: string): Promise<any[]> {
  try {
    const snapshots = await database.all(
      `SELECT id, snapshot_dir, state_metadata, created_at
       FROM recovery_snapshots
       WHERE run_id = ?
       ORDER BY created_at DESC`,
      [runId],
    )

    return snapshots.map((s: any) => ({
      ...s,
      stateMetadata: JSON.parse(s.state_metadata || '{}'),
    }))
  } catch (error) {
    console.error('Error listing snapshots:', error)
    return []
  }
}

// Delete a snapshot
export async function deleteSnapshot(snapshotId: string): Promise<void> {
  try {
    const snapshot = await database.get(
      'SELECT snapshot_dir FROM recovery_snapshots WHERE id = ?',
      [snapshotId],
    )

    if (snapshot && fs.existsSync(snapshot.snapshot_dir)) {
      fs.rmSync(snapshot.snapshot_dir, { recursive: true })
    }

    await database.run('DELETE FROM recovery_snapshots WHERE id = ?', [snapshotId])
    console.log(`Deleted snapshot ${snapshotId}`)
  } catch (error) {
    console.error('Error deleting snapshot:', error)
  }
}

// Helper: Copy directory recursively
function copyDirRecursive(source: string, destination: string): void {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true })
  }

  const files = fs.readdirSync(source)

  files.forEach((file) => {
    const sourcePath = path.join(source, file)
    const destPath = path.join(destination, file)

    const stat = fs.statSync(sourcePath)

    if (stat.isDirectory()) {
      copyDirRecursive(sourcePath, destPath)
    } else {
      fs.copyFileSync(sourcePath, destPath)
    }
  })
}

// Check if snapshot exists
export function snapshotExists(snapshotDir: string): boolean {
  return fs.existsSync(snapshotDir) && fs.existsSync(path.join(snapshotDir, 'metadata.json'))
}

// Get snapshot metadata
export function getSnapshotMetadata(snapshotDir: string): Record<string, unknown> | null {
  try {
    const metadataPath = path.join(snapshotDir, 'metadata.json')
    if (!fs.existsSync(metadataPath)) {
      return null
    }
    const content = fs.readFileSync(metadataPath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.error('Error reading snapshot metadata:', error)
    return null
  }
}
