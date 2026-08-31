import { RetryPolicy } from '@/lib/types/domain'

// Calculate delay based on retry count and strategy
export function calculateBackoffDelay(
  retryCount: number,
  policy: RetryPolicy,
): number {
  const { backoffStrategy, initialDelayMs, maxDelayMs } = policy

  let delay: number

  switch (backoffStrategy) {
    case 'exponential':
      delay = initialDelayMs * Math.pow(2, retryCount)
      break
    case 'linear':
      delay = initialDelayMs * (retryCount + 1)
      break
    case 'fixed':
    default:
      delay = initialDelayMs
      break
  }

  // Cap at max delay
  return Math.min(delay, maxDelayMs)
}

// Check if a run should be retried
export async function shouldRetry(
  runId: string,
  policy: RetryPolicy,
  database: any,
): Promise<boolean> {
  try {
    // Get retry history for this run
    const retries = await database.all(
      'SELECT * FROM runs WHERE original_run_id = ? ORDER BY created_at DESC',
      [runId],
    )

    const retryCount = retries.length

    // Check if max retries exceeded
    if (retryCount >= policy.maxRetries) {
      console.log(`Run ${runId} exceeded max retries (${retryCount}/${policy.maxRetries})`)
      return false
    }

    return true
  } catch (error) {
    console.error('Error checking retry eligibility:', error)
    return false
  }
}

// Create a retry run
export async function createRetryRun(
  originalRunId: string,
  policy: RetryPolicy,
  database: any,
): Promise<string> {
  try {
    // Get original run
    const originalRun = await database.get('SELECT * FROM runs WHERE id = ?', [originalRunId])
    if (!originalRun) {
      throw new Error(`Original run ${originalRunId} not found`)
    }

    // Count existing retries
    const retries = await database.all(
      'SELECT * FROM runs WHERE original_run_id = ? OR id = ?',
      [originalRunId, originalRunId],
    )
    const retryCount = retries.length - 1 // Don't count original

    // Check max retries
    if (retryCount >= policy.maxRetries) {
      throw new Error(`Max retries (${policy.maxRetries}) exceeded`)
    }

    // Create retry run
    const newRunId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = Math.floor(Date.now() / 1000)
    const delayMs = calculateBackoffDelay(retryCount, policy)

    await database.run(
      `INSERT INTO runs (id, task_id, agent_id, status, original_run_id, retry_count, retry_delay_ms, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newRunId,
        originalRun.task_id,
        originalRun.agent_id,
        'pending',
        originalRunId,
        retryCount + 1,
        delayMs,
        now,
      ],
    )

    console.log(`Created retry run ${newRunId} for ${originalRunId} (retry ${retryCount + 1}/${policy.maxRetries})`)
    return newRunId
  } catch (error) {
    console.error('Error creating retry run:', error)
    throw error
  }
}

// Get retry history for a run
export async function getRetryHistory(
  runId: string,
  database: any,
): Promise<any[]> {
  try {
    // Find original run
    const run = await database.get('SELECT * FROM runs WHERE id = ?', [runId])
    if (!run) return []

    const originalRunId = run.original_run_id || runId

    // Get all runs in this retry chain
    const history = await database.all(
      `SELECT id, status, created_at, total_cost, retry_count
       FROM runs
       WHERE id = ? OR original_run_id = ?
       ORDER BY created_at ASC`,
      [originalRunId, originalRunId],
    )

    return history
  } catch (error) {
    console.error('Error fetching retry history:', error)
    return []
  }
}

// Check if error is likely recoverable (flaky failure)
export function isRecoverableError(errorMessage: string): boolean {
  const recoverablePatterns = [
    'timeout',
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'rate limit',
    'temporarily unavailable',
    '503',
    '429',
  ]

  const lowerError = errorMessage.toLowerCase()
  return recoverablePatterns.some((pattern) => lowerError.includes(pattern.toLowerCase()))
}
