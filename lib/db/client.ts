import Database from 'better-sqlite3'
import path from 'path'
import os from 'os'
import { schema, builtInProviders } from './schema'

let db: Database.Database | null = null

const getDbPath = (): string => {
  const phoenixDir = path.join(os.homedir(), '.phoenix')
  return path.join(phoenixDir, 'phoenix.db')
}

export function initializeDb(): Database.Database {
  if (db) return db

  const dbPath = getDbPath()
  db = new Database(dbPath)

  // Enable foreign keys
  db.pragma('foreign_keys = ON')

  // Initialize schema
  db.exec(schema)

  // Seed built-in providers if not present
  const providerCount = db
    .prepare('SELECT COUNT(*) as count FROM providers')
    .get() as { count: number }

  if (providerCount.count === 0) {
    const insertProvider = db.prepare(`
      INSERT INTO providers (id, name, type, description, config_schema, available_models)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    for (const provider of builtInProviders) {
      insertProvider.run(
        provider.id,
        provider.name,
        provider.type,
        provider.description,
        JSON.stringify(provider.configSchema),
        JSON.stringify(provider.availableModels),
      )
    }
  }

  return db
}

export function getDb(): Database.Database {
  if (!db) {
    return initializeDb()
  }
  return db
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}

// Query helpers
export const db = {
  prepare: (sql: string) => getDb().prepare(sql),
  exec: (sql: string) => getDb().exec(sql),
  transaction: <T,>(fn: () => T): T => {
    const transaction = getDb().transaction(fn)
    return transaction()
  },
}
