import path from 'path'
import fs from 'fs'

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: Record<string, unknown>
  error?: string
}

const LOG_LEVELS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
}

let currentLogLevel: LogLevel = 'INFO'
let logFilePath: string | null = null

// Initialize logger
export function initializeLogger(level: LogLevel = 'INFO', logDir?: string): void {
  currentLogLevel = level

  if (logDir) {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }

    const date = new Date().toISOString().split('T')[0]
    logFilePath = path.join(logDir, `phoenix-${date}.log`)
  }
}

// Log a message
export function log(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
): void {
  if (LOG_LEVELS[level] < LOG_LEVELS[currentLogLevel]) {
    return
  }

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
  }

  // Console output
  const prefix = `[${entry.timestamp}] ${level}`
  const output = context ? `${prefix} ${message} ${JSON.stringify(context)}` : `${prefix} ${message}`

  switch (level) {
    case 'DEBUG':
      console.debug(output)
      break
    case 'INFO':
      console.log(output)
      break
    case 'WARN':
      console.warn(output)
      break
    case 'ERROR':
      console.error(output)
      break
  }

  // File output
  if (logFilePath) {
    writeToFile(entry)
  }
}

// Log error with stack trace
export function logError(
  message: string,
  error: Error | unknown,
  context?: Record<string, unknown>,
): void {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorStack = error instanceof Error ? error.stack : undefined

  log('ERROR', message, {
    ...context,
    error: errorMessage,
    stack: errorStack,
  })
}

// Convenience methods
export const logger = {
  debug: (message: string, context?: Record<string, unknown>) =>
    log('DEBUG', message, context),
  info: (message: string, context?: Record<string, unknown>) =>
    log('INFO', message, context),
  warn: (message: string, context?: Record<string, unknown>) =>
    log('WARN', message, context),
  error: (message: string, error?: Error | unknown, context?: Record<string, unknown>) =>
    logError(message, error || new Error(message), context),
}

// Write log entry to file
function writeToFile(entry: LogEntry): void {
  if (!logFilePath) return

  try {
    const line = JSON.stringify(entry) + '\n'
    fs.appendFileSync(logFilePath, line, 'utf-8')
  } catch (error) {
    console.error('Failed to write to log file:', error)
  }
}

// Get logs from file
export function getLogFile(logDir: string): string | null {
  try {
    const date = new Date().toISOString().split('T')[0]
    const filePath = path.join(logDir, `phoenix-${date}.log`)

    if (fs.existsSync(filePath)) {
      return filePath
    }
  } catch (error) {
    console.error('Error getting log file:', error)
  }

  return null
}

// Export logs as JSON
export function exportLogs(logDir: string): LogEntry[] {
  try {
    const logFile = getLogFile(logDir)
    if (!logFile) return []

    const content = fs.readFileSync(logFile, 'utf-8')
    const lines = content.split('\n').filter((line) => line.trim())

    return lines.map((line) => {
      try {
        return JSON.parse(line)
      } catch {
        return null
      }
    }).filter(Boolean) as LogEntry[]
  } catch (error) {
    console.error('Error exporting logs:', error)
    return []
  }
}

// Clear old logs (older than N days)
export function clearOldLogs(logDir: string, daysToKeep: number = 7): void {
  try {
    if (!fs.existsSync(logDir)) return

    const files = fs.readdirSync(logDir)
    const now = Date.now()
    const retentionMs = daysToKeep * 24 * 60 * 60 * 1000

    for (const file of files) {
      if (file.startsWith('phoenix-') && file.endsWith('.log')) {
        const filePath = path.join(logDir, file)
        const stats = fs.statSync(filePath)
        const fileAge = now - stats.mtime.getTime()

        if (fileAge > retentionMs) {
          fs.unlinkSync(filePath)
          logger.info(`Deleted old log file: ${file}`)
        }
      }
    }
  } catch (error) {
    console.error('Error clearing old logs:', error)
  }
}
