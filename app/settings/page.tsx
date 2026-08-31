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
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-600">System configuration and maintenance</p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-lg bg-green-50 p-4 text-sm text-green-800">
            {success}
          </div>
        )}

        {/* Provider Configuration */}
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Provider Configuration</h2>
              <p className="mt-2 text-sm text-gray-600">
                Configure AI providers (Claude, OpenAI, Pi) to enable agents to execute tasks
              </p>
            </div>
            <Link
              href="/settings/providers"
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Configure Providers →
            </Link>
          </div>
        </div>

        {/* Backup & Restore */}
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-gray-900">Backup & Restore</h2>

          <div className="mb-6">
            <button
              onClick={handleCreateBackup}
              disabled={isLoading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isLoading ? 'Creating...' : 'Create Backup Now'}
            </button>
            <p className="mt-2 text-sm text-gray-600">
              Backups include database and project data
            </p>
          </div>

          {backups.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Recent Backups:</h3>
              {backups.map((backup) => (
                <div
                  key={backup.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                >
                  <div>
                    <p className="font-medium text-gray-900">{formatDate(backup.timestamp)}</p>
                    <p className="text-sm text-gray-600">Size: {formatBytes(backup.size)}</p>
                  </div>
                  <button
                    onClick={() => handleRestoreBackup(backup.id)}
                    disabled={isLoading}
                    className="rounded px-3 py-1 text-sm bg-yellow-600 text-white hover:bg-yellow-700 disabled:bg-gray-400"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Logging */}
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-gray-900">Logging</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700">Log Level</label>
            <select
              value={logLevel}
              onChange={(e) => handleLogLevelChange(e.target.value)}
              className="mt-1 block rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
              disabled={isLoading}
            >
              <option value="DEBUG">DEBUG (Verbose)</option>
              <option value="INFO">INFO (Standard)</option>
              <option value="WARN">WARN (Important)</option>
              <option value="ERROR">ERROR (Critical Only)</option>
            </select>
            <p className="mt-2 text-sm text-gray-600">
              Controls verbosity of system logs
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-gray-900">Features</h2>

          <div className="space-y-3">
            {[
              { name: 'Custom Skills', description: 'Register and use custom skills' },
              { name: 'Plugins', description: 'Install and configure plugins' },
              { name: 'Recovery', description: 'Automatic recovery snapshots' },
              { name: 'Logging', description: 'Structured logging and audit trail' },
            ].map((feature) => (
              <div key={feature.name} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{feature.name}</p>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
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
