import { spawn } from 'child_process'
import { database } from '@/lib/db/client'
import { callProvider } from '@/lib/providers/call'
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
    // Fetch run with task, agent, provider, and project details
    const run = await database.get(
      `SELECT r.*, t.name as task_name, t.command, t.description, t.project_id,
              p.base_directory, a.name as agent_name, a.description as agent_description,
              a.model as agent_model, pr.type as provider_type, pr.config as provider_config
       FROM runs r
       JOIN tasks t ON r.task_id = t.id
       JOIN agents a ON r.agent_id = a.id
       JOIN projects p ON t.project_id = p.id
       JOIN providers pr ON a.provider_id = pr.id
       WHERE r.id = ?`,
      [runId],
    )

    if (!run) {
      throw new Error(`Run ${runId} not found`)
    }

    // Update run status to running
    const now = Math.floor(Date.now() / 1000)
    await database.run(
      'UPDATE runs SET status = ?, started_at = ? WHERE id = ?',
      ['running', now, runId],
    )

    console.log(`Starting execution of run ${runId}: ${run.task_name}`)

    // Validate base_directory is set and not in src
    if (!run.base_directory) {
      throw new Error('Project base_directory not configured')
    }

    if (run.base_directory.includes('/src/') || run.base_directory.includes('/src')) {
      throw new Error(`Invalid project directory - files cannot be written to src: ${run.base_directory}`)
    }

    // Ensure project working directory exists
    if (!fs.existsSync(run.base_directory)) {
      fs.mkdirSync(run.base_directory, { recursive: true })
      console.log(`Created working directory: ${run.base_directory}`)
    }

    // Create logs and artifacts subdirectories
    const logsDir = path.join(run.base_directory, 'logs')
    const artifactsDir = path.join(run.base_directory, 'artifacts')

    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true })
    }
    if (!fs.existsSync(artifactsDir)) {
      fs.mkdirSync(artifactsDir, { recursive: true })
    }

    const startTime = Date.now()

    let stdout = ''
    let stderr = ''
    let exitCode = 0
    let logContent: string

    if (run.command) {
      // Command-based task: spawn a shell command
      const result = await executeCommand(run.command, run.base_directory, runId)
      stdout = result.stdout
      stderr = result.stderr
      exitCode = result.exitCode

      logContent = `Task: ${run.task_name}
Description: ${run.description || 'N/A'}
Command: ${run.command}
Working Directory: ${run.base_directory}

=== STDOUT ===
${stdout}

=== STDERR ===
${stderr}

Exit Code: ${exitCode}
Duration: ${Date.now() - startTime}ms
Timestamp: ${new Date().toISOString()}`
    } else {
      // Agent-based task: call the bound provider directly
      const providerConfig = JSON.parse(run.provider_config || '{}')
      const systemPrompt = [run.agent_name, run.agent_description].filter(Boolean).join('\n\n')
      const userPrompt = [run.task_name, run.description].filter(Boolean).join('\n\n')

      const result = await callProvider(
        run.provider_type,
        { apiKey: providerConfig.apiKey, endpoint: providerConfig.endpoint, model: run.agent_model },
        { system: systemPrompt, user: userPrompt },
      )

      if (result.success) {
        stdout = result.text || ''
        exitCode = 0

        // Write the response out as a linkable artifact alongside the raw log
        const outputFile = path.join(run.base_directory, `${runId}-output.md`)
        fs.writeFileSync(outputFile, stdout)
      } else {
        stderr = result.error || 'Provider call failed'
        exitCode = 1
      }

      logContent = `Task: ${run.task_name}
Description: ${run.description || 'N/A'}
Agent: ${run.agent_name}
Provider: ${run.provider_type}

=== PROMPT (system) ===
${systemPrompt}

=== PROMPT (user) ===
${userPrompt}

=== AGENT RESPONSE ===
${stdout || stderr}

Duration: ${Date.now() - startTime}ms
Timestamp: ${new Date().toISOString()}`
    }

    const duration = Date.now() - startTime
    const status = exitCode === 0 ? 'completed' : 'failed'

    // Save execution logs with full details
    const logFile = path.join(logsDir, `${runId}.log`)
    fs.writeFileSync(logFile, logContent)

    // Scan for created artifacts (files in working directory, excluding logs/artifacts dirs)
    const artifacts: Array<{ name: string; path: string; size: number }> = []
    try {
      const files = fs.readdirSync(run.base_directory)
      for (const file of files) {
        if (file !== 'logs' && file !== 'artifacts' && file !== '.recovery' && file !== '.config') {
          const filePath = path.join(run.base_directory, file)
          const stat = fs.statSync(filePath)
          if (stat.isFile()) {
            artifacts.push({
              name: file,
              path: filePath,
              size: stat.size,
            })
          }
        }
      }
    } catch (e) {
      console.error('Failed to scan for artifacts:', e)
    }

    // Log discovered artifacts
    if (artifacts.length > 0) {
      console.log(`Found ${artifacts.length} artifacts:`)
      for (const artifact of artifacts) {
        console.log(`  - ${artifact.name} (${artifact.size} bytes)`)
      }
    }

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
      // Find pending runs - command-based tasks spawn a shell command,
      // agent-based tasks call the bound provider directly (see executeRun)
      const pendingRuns = await database.all(
        `SELECT r.id FROM runs r
         WHERE r.status = ?
         ORDER BY r.created_at ASC LIMIT 1`,
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
