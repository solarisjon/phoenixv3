// SQLite database client for Phoenix v3
// Note: For MVP, using sqlite3 npm package
// Future: migrate to better-sqlite3 for better performance

import path from 'path'
import os from 'os'
import { schema } from './schema'

let db: any = null
let dbInitialized = false

const getDbPath = (): string => {
  const fs = require('fs')
  // Primary location: ~/.config/phoenixv3
  const configDir = path.join(os.homedir(), '.config', 'phoenixv3')
  // Fallback location: ~/.phoenixv3
  const homeDir = path.join(os.homedir(), '.phoenixv3')

  let phoenixDir = configDir

  // If ~/.phoenixv3 exists and ~/.config/phoenixv3 doesn't, use home dir for compatibility
  if (!fs.existsSync(configDir) && fs.existsSync(homeDir)) {
    phoenixDir = homeDir
  }

  // Ensure phoenix directory exists
  try {
    if (!fs.existsSync(phoenixDir)) {
      fs.mkdirSync(phoenixDir, { recursive: true })
    }
  } catch (e) {
    console.error(`Failed to create ${phoenixDir} directory:`, e)
  }
  return path.join(phoenixDir, 'phoenix.db')
}

export async function initializeDb(): Promise<void> {
  if (dbInitialized) return

  try {
    // Dynamic import for sqlite3
    const sqlite3 = require('sqlite3').verbose()
    const dbPath = getDbPath()

    db = new sqlite3.Database(dbPath, (err: any) => {
      if (err) {
        console.error('Database connection error:', err)
      }
    })

    // Enable foreign keys
    await new Promise<void>((resolve, reject) => {
      db.run('PRAGMA foreign_keys = ON', (err: any) => {
        if (err) reject(err)
        else resolve()
      })
    })

    // Initialize schema - await all statements
    const statements = schema.split(';').filter((s: string) => s.trim())
    for (const stmt of statements) {
      if (stmt.trim()) {
        await new Promise<void>((resolve, reject) => {
          db.run(stmt + ';', (err: any) => {
            if (err) reject(err)
            else resolve()
          })
        })
      }
    }

    // Don't auto-seed providers - let users add them manually via settings

    dbInitialized = true

    // Start task executor after database is initialized (skip in test env)
    if (process.env.NODE_ENV !== 'test') {
      setTimeout(() => {
        import('@/lib/executor/engine').then(({ startTaskExecutor, isTaskExecutorRunning }) => {
          if (!isTaskExecutorRunning()) {
            startTaskExecutor(2000)
            console.log('Task executor started')
          }
        })
      }, 100)
    }
  } catch (e) {
    console.error('Failed to initialize database:', e)
  }
}

export function getDb(): any {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDb() first.')
  }
  return db
}

export function closeDb(): void {
  if (db) {
    db.close((err: any) => {
      if (err) {
        console.error('Error closing database:', err)
      }
    })
    db = null
    dbInitialized = false
  }
}

// Query helpers (async/callback-based due to sqlite3)
export const database = {
  run: (sql: string, params: any[] = []): Promise<any> => {
    return new Promise((resolve, reject) => {
      getDb().run(sql, params, function (this: any, err: any) {
        if (err) reject(err)
        else resolve({ lastID: this.lastID, changes: this.changes })
      })
    })
  },

  get: (sql: string, params: any[] = []): Promise<any> => {
    return new Promise((resolve, reject) => {
      getDb().get(sql, params, (err: any, row: any) => {
        if (err) reject(err)
        else resolve(row)
      })
    })
  },

  all: (sql: string, params: any[] = []): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      getDb().all(sql, params, (err: any, rows: any[]) => {
        if (err) reject(err)
        else resolve(rows || [])
      })
    })
  },

  exec: (sql: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      getDb().exec(sql, (err: any) => {
        if (err) reject(err)
        else resolve()
      })
    })
  },
}
