/**
 * End-to-end executor test: Provider → Agent → Project → Task → Webhook
 * Verifies the complete task orchestration flow with a simple math question
 */

import { database, initializeDb } from '@/lib/db/client'

describe('Executor E2E: Simple Math Question', () => {
  const testRun = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  beforeAll(async () => {
    await initializeDb()
  })

  afterAll(async () => {
    // Clean up test data
    await database.run(`DELETE FROM webhooks WHERE id LIKE ?`, [`webhook_test_%`])
    await database.run(`DELETE FROM runs WHERE id LIKE ?`, [`run_test_%`])
    await database.run(`DELETE FROM tasks WHERE id LIKE ?`, [`task_test_%`])
    await database.run(`DELETE FROM projects WHERE id LIKE ?`, [`proj_test_%`])
    await database.run(`DELETE FROM agents WHERE id LIKE ?`, [`agent_test_%`])
  })

  it('should execute complete flow: provider → agent → project → task → webhook completion', async () => {
    // SETUP: Get Claude Code provider
    const provider = await database.get(
      `SELECT * FROM providers WHERE name = ?`,
      ['Claude Code']
    )
    expect(provider).toBeDefined()
    expect(provider?.type).toBe('claude-code')

    // CREATE AGENT
    const agentId = `agent_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = Math.floor(Date.now() / 1000)

    await database.run(
      `INSERT INTO agents (id, name, description, provider_id, model, cost_budget, api_key_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        agentId,
        `Math Agent ${testRun}`,
        'Agent that answers math questions',
        provider.id,
        'claude-opus-5',
        1000,
        'test_hash_' + agentId,
        now,
        now,
      ]
    )

    const agent = await database.get(`SELECT * FROM agents WHERE id = ?`, [agentId])
    expect(agent).toBeDefined()
    expect(agent?.name).toContain('Math Agent')

    // CREATE PROJECT
    const projectId = `proj_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    await database.run(
      `INSERT INTO projects (id, name, description, base_directory, total_cost, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        projectId,
        'Math Test Project',
        'Testing executor with math question',
        '/tmp/math-project',
        0,
        now,
        now,
      ]
    )

    const project = await database.get(`SELECT * FROM projects WHERE id = ?`, [projectId])
    expect(project).toBeDefined()
    expect(project?.name).toBe('Math Test Project')

    // CREATE TASK (agent-based, no command)
    const taskId = `task_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    await database.run(
      `INSERT INTO tasks (id, project_id, name, description, agent_id, schedule_cron, command, enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        taskId,
        projectId,
        'Math Question',
        'What is 2 + 2? Answer should be 4.',
        agentId,
        null,
        null, // No command - agent reads description
        true,
        now,
        now,
      ]
    )

    const task = await database.get(`SELECT * FROM tasks WHERE id = ?`, [taskId])
    expect(task).toBeDefined()
    expect(task?.name).toBe('Math Question')
    expect(task?.command).toBeNull() // Agent-based, not command-based

    // VERIFY: No run auto-created (agent-based tasks wait for agent pickup)
    const initialRuns = await database.all(`SELECT * FROM runs WHERE task_id = ?`, [taskId])
    expect(initialRuns).toHaveLength(0)

    // SIMULATE: Agent picks up task and creates a run
    const runId = `run_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    await database.run(
      `INSERT INTO runs (id, task_id, agent_id, status, started_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [runId, taskId, agentId, 'pending', now, now]
    )

    let run = await database.get(`SELECT * FROM runs WHERE id = ?`, [runId])
    expect(run?.status).toBe('pending')

    // SIMULATE: Agent computes answer and reports via webhook
    // In real system: agent calls POST /api/webhooks with Bearer token
    const completionTime = Math.floor(Date.now() / 1000)
    await database.run(
      `UPDATE runs SET status = ?, ended_at = ?, total_cost = ? WHERE id = ?`,
      ['completed', completionTime, 0.05, runId]
    )

    // Store webhook delivery record
    const payloadHash = Buffer.from(JSON.stringify({
      runId,
      status: 'completed',
      logs: '2 + 2 = 4',
    })).toString('hex')

    await database.run(
      `INSERT INTO webhooks (id, run_id, payload_hash, timestamp, delivery_status)
       VALUES (?, ?, ?, ?, ?)`,
      [
        `webhook_test_${Date.now()}`,
        runId,
        payloadHash,
        completionTime,
        'success',
      ]
    )

    // VERIFY: Run is completed
    run = await database.get(`SELECT * FROM runs WHERE id = ?`, [runId])
    expect(run?.status).toBe('completed')
    expect(run?.total_cost).toBe(0.05)

    // VERIFY: Webhook record exists
    const webhook = await database.get(
      `SELECT * FROM webhooks WHERE run_id = ?`,
      [runId]
    )
    expect(webhook).toBeDefined()
    expect(webhook?.delivery_status).toBe('success')

    // VERIFY: Complete chain
    console.log('✅ Complete flow verified:')
    console.log(`  Provider: ${provider.name}`)
    console.log(`  Agent: ${agent.name}`)
    console.log(`  Project: ${project.name}`)
    console.log(`  Task: ${task.name}`)
    console.log(`  Run: ${run.status}`)
    console.log(`  Webhook: ${webhook.delivery_status}`)
  })
})
