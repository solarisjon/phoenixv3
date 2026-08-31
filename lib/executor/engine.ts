import { spawn } from 'child_process'
import { database } from '@/lib/db/client'
import path from 'path'
import fs from 'fs'

interface ExecutionResult {
  runId: string
  status: 'completed' | 'failed'
  stdout: string
  stderr: string
  exitCode: number
  duration: number
}

// Execute a run's task
export async function executeRun(runId: string): Promise<ExecutionResult> {
  try {
    // Fetch run with task and project details
    const run = await database.get(
      `SELECT r.*, t.name as task_name, t.command, t.description, t.project_id,
              p.base_directory, a.name as agent_name
       FROM runs r
       JOIN tasks t ON r.task_id = t.id
       JOIN agents a ON r.agent_id = a.id
       JOIN projects p ON t.project_id = p.id
       WHERE r.id = ?`,
      [runId],
    )

    if (!run) {
      throw new Error(`Run ${runId} not found`)
    }

    if (!run.command) {
      throw new Error(`Task ${run.task_id} has no command configured`)
    }

    // Update run status to running
    const now = Math.floor(Date.now() / 1000)
    await database.run(
      'UPDATE runs SET status = ?, started_at = ? WHERE id = ?',
      ['running', now, runId],
    )

    console.log(`Starting execution of run ${runId}: ${run.task_name}`)

    // Create run log directory
    const logsDir = path.join(run.base_directory, 'logs')
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true })
    }

    // Execute command
    const startTime = Date.now()
    const { stdout, stderr, exitCode } = await executeCommand(
      run.command,
      run.base_directory,
      runId,
    )
    const duration = Date.now() - startTime

    const status = exitCode === 0 ? 'completed' : 'failed'

    // Save execution logs
    const logFile = path.join(logsDir, `${runId}.log`)
    fs.writeFileSync(
      logFile,
      `Task: ${run.task_name}\nDescription: ${run.description || 'N/A'}\nCommand: ${run.command}\n\n=== STDOUT ===\n${stdout}\n\n=== STDERR ===\n${stderr}\n\nExit Code: ${exitCode}\nDuration: ${duration}ms`,
    )

    // Update run status
    await database.run(
      'UPDATE runs SET status = ?, ended_at = ? WHERE id = ?',
      [status, Math.floor(Date.now() / 1000), runId],
    )

    console.log(`Completed run ${runId}: ${status} (${duration}ms)`)

    return {
      runId,
      status,
      stdout,
      stderr,
      exitCode,
      duration,
    }
  } catch (error) {
    console.error(`Execution error for run ${runId}:`, error)

    // Mark run as failed
    try {
      await database.run('UPDATE runs SET status = ?, ended_at = ? WHERE id = ?', [
        'failed',
        Math.floor(Date.now() / 1000),
        runId,
      ])
    } catch (e) {
      console.error('Failed to update run status:', e)
    }

    throw error
  }
}

// Execute a shell command
async function executeCommand(
  command: string,
  cwd: string,
  runId: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const proc = spawn('sh', ['-c', command], {
      cwd,
      env: { ...process.env, PHOENIX_RUN_ID: runId },
      timeout: 5 * 60 * 1000, // 5 minute timeout
    })

    let stdout = ''
    let stderr = ''

    proc.stdout?.on('data', (data) => {
      const chunk = data.toString()
      stdout += chunk
      console.log(`[${runId}] ${chunk}`)
    })

    proc.stderr?.on('data', (data) => {
      const chunk = data.toString()
      stderr += chunk
      console.error(`[${runId}] ${chunk}`)
    })

    proc.on('error', (error) => {
      reject(new Error(`Failed to execute command: ${error.message}`))
    })

    proc.on('close', (code) => {
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 1,
      })
    })
  })
}

// Poll and execute pending runs
let isExecuting = false

export async function startTaskExecutor(pollIntervalMs: number = 2000): Promise<void> {
  if (isExecuting) return

  isExecuting = true
  console.log('Task executor started')

  const executePending = async () => {
    try {
      // Find pending runs
      const pendingRuns = await database.all(
        'SELECT id FROM runs WHERE status = ? ORDER BY created_at ASC LIMIT 1',
        ['pending'],
      )

      for (const run of pendingRuns) {
        try {
          await executeRun(run.id)
        } catch (error) {
          console.error(`Failed to execute run ${run.id}:`, error)
        }
      }
    } catch (error) {
      console.error('Error polling for pending runs:', error)
    }

    if (isExecuting) {
      setTimeout(executePending, pollIntervalMs)
    }
  }

  executePending()
}

export function stopTaskExecutor(): void {
  isExecuting = false
  console.log('Task executor stopped')
}

export function isTaskExecutorRunning(): boolean {
  return isExecuting
}
