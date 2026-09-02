'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Backup {
  id: string
  timestamp: string
  size: number
  daysToKeep: number
}

export default function SettingsPage() {
  const [backups, setBackups] = useState<Backup[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [logLevel, setLogLevel] = useState('INFO')

  useEffect(() => {
    loadBackups()
  }, [])

  const loadBackups = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/settings?action=backups')
      if (!res.ok) throw new Error('Failed to load backups')
      const data = await res.json()
      setBackups(data.backups)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load backups')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateBackup = async () => {
    try {
      setIsLoading(true)
      setError(null)
      setSuccess(null)

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-backup', daysToKeep: 30 }),
      })

      if (!res.ok) throw new Error('Failed to create backup')

      await res.json()
      setSuccess('Backup created successfully')
      loadBackups()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create backup')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRestoreBackup = async (backupId: string) => {
    if (!confirm('This will restore all data from the backup. Continue?')) {
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      setSuccess(null)

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore-backup', backupId }),
      })

      if (!res.ok) throw new Error('Failed to restore backup')

      setSuccess('Backup restored successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore backup')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogLevelChange = async (level: string) => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set-log-level', level }),
      })

      if (!res.ok) throw new Error('Failed to change log level')

      setLogLevel(level)
      setSuccess('Log level updated')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change log level')
    } finally {
      setIsLoading(false)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="mt-2 text-muted">System configuration and maintenance</p>
        </div>

        {error && (
          <div className="mb-6 banner-error">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 banner-success">
            {success}
          </div>
        )}

        {/* Provider Configuration */}
        <div className="mb-8 rounded-lg border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">Provider Configuration</h2>
              <p className="mt-2 text-sm text-muted">
                Configure AI providers (Claude, OpenAI, Pi) to enable agents to execute tasks
              </p>
            </div>
            <Link
              href="/settings/providers"
              className="rounded-lg bg-primary px-4 py-2 text-white hover:opacity-90"
            >
              Configure Providers →
            </Link>
          </div>
        </div>

        {/* Backup & Restore */}
        <div className="mb-8 rounded-lg border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-foreground">Backup & Restore</h2>

          <div className="mb-6">
            <button
              onClick={handleCreateBackup}
              disabled={isLoading}
              className="rounded-lg bg-primary px-4 py-2 text-white hover:opacity-90 disabled:opacity-60"
            >
              {isLoading ? 'Creating...' : 'Create Backup Now'}
            </button>
            <p className="mt-2 text-sm text-muted">
              Backups include database and project data
            </p>
          </div>

          {backups.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-foreground">Recent Backups:</h3>
              {backups.map((backup) => (
                <div
                  key={backup.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="font-medium text-foreground">{formatDate(backup.timestamp)}</p>
                    <p className="text-sm text-muted">Size: {formatBytes(backup.size)}</p>
                  </div>
                  <button
                    onClick={() => handleRestoreBackup(backup.id)}
                    disabled={isLoading}
                    className="btn-warning rounded px-3 py-1 text-sm"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Logging */}
        <div className="mb-8 rounded-lg border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-foreground">Logging</h2>

          <div>
            <label className="block text-sm font-medium text-foreground">Log Level</label>
            <select
              value={logLevel}
              onChange={(e) => handleLogLevelChange(e.target.value)}
              className="mt-1 block rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:ring-primary"
              disabled={isLoading}
            >
              <option value="DEBUG">DEBUG (Verbose)</option>
              <option value="INFO">INFO (Standard)</option>
              <option value="WARN">WARN (Important)</option>
              <option value="ERROR">ERROR (Critical Only)</option>
            </select>
            <p className="mt-2 text-sm text-muted">
              Controls verbosity of system logs
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-foreground">Features</h2>

          <div className="space-y-3">
            {[
              { name: 'Custom Skills', description: 'Register and use custom skills' },
              { name: 'Plugins', description: 'Install and configure plugins' },
              { name: 'Recovery', description: 'Automatic recovery snapshots' },
              { name: 'Logging', description: 'Structured logging and audit trail' },
            ].map((feature) => (
              <div key={feature.name} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{feature.name}</p>
                  <p className="text-sm text-muted">{feature.description}</p>
                </div>
                <span className="badge-success rounded-full px-3 py-1">
                  Enabled
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
