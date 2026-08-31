import cron from 'node-cron'
import { database } from '@/lib/db/client'

interface ScheduledJob {
  taskId: string
  task: cron.ScheduledTask
}

const scheduledJobs: Map<string, ScheduledJob> = new Map()

// Parse cron expression - supports simple formats like "7 12 17" (specific hours)
export function parseCronExpression(input: string): string {
  // If it's a comma-separated list of hours, convert to cron
  if (/^\d+(\s+\d+)*$/.test(input)) {
    const hours = input.trim().split(/\s+/).sort()
    return `0 ${hours.join(',')} * * *` // Run at specified hours every day
  }

  // If it's already a cron expression, validate it
  if (cron.validate(input)) {
    return input
  }

  // Default to daily at 7 AM if invalid
  console.warn(`Invalid cron expression: ${input}, using default "0 7 * * *"`)
  return '0 7 * * *'
}

// Schedule a task to run at specified cron time
export async function scheduleTask(taskId: string, cronExpression: string): Promise<void> {
  try {
    // Stop existing job if any
    stopTask(taskId)

    const validCron = parseCronExpression(cronExpression)

    // Schedule the job
    const job = cron.schedule(validCron, async () => {
      await triggerTaskRun(taskId)
    })

    scheduledJobs.set(taskId, { taskId, task: job })
    console.log(`Scheduled task ${taskId} with cron: ${validCron}`)
  } catch (error) {
    console.error(`Failed to schedule task ${taskId}:`, error)
  }
}

// Stop a scheduled task
export function stopTask(taskId: string): void {
  const job = scheduledJobs.get(taskId)
  if (job) {
    job.task.stop()
    scheduledJobs.delete(taskId)
    console.log(`Stopped scheduled task ${taskId}`)
  }
}

// Trigger a task run immediately (only for command-based tasks)
export async function triggerTaskRun(taskId: string): Promise<string> {
  try {
    // Fetch task
    const task = await database.get('SELECT * FROM tasks WHERE id = ?', [taskId])
    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }

    // Only auto-trigger command-based tasks. Agent-based tasks wait for agent pickup.
    if (!task.command) {
      console.log(`Task ${taskId} is agent-based (no command), skipping auto-trigger`)
      return ''
    }

    // Check if agent is over budget
    const agent = await database.get('SELECT * FROM agents WHERE id = ?', [task.agent_id])
    if (!agent) {
      throw new Error(`Agent ${task.agent_id} not found`)
    }

    const agentCostResult = await database.get(
      'SELECT COALESCE(SUM(total_cost), 0) as total_cost FROM runs WHERE agent_id = ?',
      [task.agent_id],
    )

    if (agentCostResult.total_cost >= agent.cost_budget) {
      console.warn(`Agent ${task.agent_id} has exceeded budget, skipping run`)
      throw new Error(`Agent budget exceeded: $${agentCostResult.total_cost} >= $${agent.cost_budget}`)
    }

    // Create run
    const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = Math.floor(Date.now() / 1000)

    await database.run(
      `INSERT INTO runs (id, task_id, agent_id, status, started_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [runId, taskId, task.agent_id, 'pending', now, now],
    )

    console.log(`Created run ${runId} for task ${taskId}`)
    return runId
  } catch (error) {
    console.error(`Failed to trigger run for task ${taskId}:`, error)
    throw error
  }
}

// Initialize scheduler - load all enabled tasks
export async function initializeScheduler(): Promise<void> {
  try {
    const tasks = await database.all(
      'SELECT id, schedule_cron FROM tasks WHERE enabled = 1 AND schedule_cron IS NOT NULL',
    )

    for (const task of tasks) {
      await scheduleTask(task.id, task.schedule_cron)
    }

    console.log(`Initialized scheduler with ${tasks.length} scheduled tasks`)
  } catch (error) {
    console.error('Failed to initialize scheduler:', error)
  }
}

// Shutdown scheduler - stop all jobs
export function shutdownScheduler(): void {
  for (const [, job] of scheduledJobs.entries()) {
    job.task.stop()
  }
  scheduledJobs.clear()
  console.log('Scheduler shut down')
}

// Get scheduled jobs
export function getScheduledJobs(): string[] {
  return Array.from(scheduledJobs.keys())
}
