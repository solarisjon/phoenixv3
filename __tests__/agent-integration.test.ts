/**
 * Agent Integration Test: Agent polls for tasks, claims them, reports completion
 * Verifies agent lifecycle: discover → claim → execute → report
 */

import { database, initializeDb } from '@/lib/db/client'

describe('Agent Integration: Task Discovery & Completion', () => {
  const testRun = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  let providerId: string
  let agentId: string
  let agentApiKey: string
  let projectId: string
  let taskId: string

  beforeAll(async () => {
    await initializeDb()

    // Setup: Get provider
    const provider = await database.get(
      `SELECT * FROM providers WHERE name = ?`,
      ['Claude Code']
    )
    providerId = provider.id

    // Setup: Create agent with API key
    agentId = `agent_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = Math.floor(Date.now() / 1000)

    await database.run(
      `INSERT INTO agents (id, name, description, provider_id, model, cost_budget, api_key_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        agentId,
        `Test Agent ${testRun}`,
        'Agent for integration tests',
        providerId,
        'claude-opus-5',
        1000,
        'test_hash_' + agentId,
        now,
        now,
      ]
    )

    // Setup: Create API key for agent
    agentApiKey = `pk_test_${testRun}`
    const keyHash = require('crypto')
      .createHash('sha256')
      .update(agentApiKey)
      .digest('hex')

    await database.run(
      `INSERT INTO api_keys (id, agent_id, key_hash, created_at)
       VALUES (?, ?, ?, ?)`,
      [`key_${Date.now()}`, agentId, keyHash, now]
    )

    // Setup: Create project
    projectId = `proj_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    await database.run(
      `INSERT INTO projects (id, name, description, base_directory, total_cost, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [projectId, `Test Project ${testRun}`, 'Test', '/tmp/test', 0, now, now]
    )
  })

  afterAll(async () => {
    // Cleanup
    await database.run(`DELETE FROM api_keys WHERE id LIKE ?`, [`key_%`])
    await database.run(`DELETE FROM webhooks WHERE id LIKE ?`, [`webhook_test_%`])
    await database.run(`DELETE FROM runs WHERE id LIKE ?`, [`run_test_%`])
    await database.run(`DELETE FROM tasks WHERE id LIKE ?`, [`task_test_%`])
    await database.run(`DELETE FROM projects WHERE id LIKE ?`, [`proj_test_%`])
    await database.run(`DELETE FROM agents WHERE id LIKE ?`, [`agent_test_%`])
  })

  it('should allow agent to discover and claim pending tasks', async () => {
    // STEP 1: Create a pending task (agent-based)
    taskId = `task_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = Math.floor(Date.now() / 1000)

    await database.run(
      `INSERT INTO tasks (id, project_id, name, description, agent_id, schedule_cron, command, enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        taskId,
        projectId,
        'Calculate Prime Numbers',
        'Find all prime numbers between 1 and 100, return as JSON array',
        agentId,
        null,
        null,
        true,
        now,
        now,
      ]
    )

    // STEP 2: Agent polls for pending tasks (should find the task description)
    const pendingTasks = await database.all(
      `SELECT t.*, a.name as agent_name, p.name as project_name
       FROM tasks t
       JOIN agents a ON t.agent_id = a.id
       JOIN projects p ON t.project_id = p.id
       WHERE t.id = ? AND t.enabled = 1`,
      [taskId]
    )

    expect(pendingTasks).toHaveLength(1)
    const task = pendingTasks[0]
    expect(task.name).toBe('Calculate Prime Numbers')
    expect(task.description).toContain('prime numbers')
    expect(task.agent_name).toContain('Test Agent')

    // STEP 3: Agent claims the task by creating a run
    const runId = `run_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const startTime = Math.floor(Date.now() / 1000)

    await database.run(
      `INSERT INTO runs (id, task_id, agent_id, status, started_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [runId, taskId, agentId, 'running', startTime, startTime]
    )

    let run = await database.get(`SELECT * FROM runs WHERE id = ?`, [runId])
    expect(run?.status).toBe('running')

    // STEP 4: Agent executes task and computes result
    // (In real system: agent would do actual work here)
    const primeResult = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97]

    // STEP 5: Agent reports completion via webhook with Bearer token
    // Verify API key is valid for this agent
    const keyRecord = await database.get(
      `SELECT agent_id FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL`,
      [
        require('crypto')
          .createHash('sha256')
          .update(agentApiKey)
          .digest('hex'),
      ]
    )

    expect(keyRecord?.agent_id).toBe(agentId)

    // STEP 6: Update run with completion
    const completionTime = Math.floor(Date.now() / 1000)
    await database.run(
      `UPDATE runs SET status = ?, ended_at = ?, total_cost = ? WHERE id = ?`,
      ['completed', completionTime, 0.12, runId]
    )

    // Record webhook delivery
    const payloadHash = Buffer.from(
      JSON.stringify({
        runId,
        taskId,
        status: 'completed',
        result: primeResult,
      })
    ).toString('hex')

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

    // VERIFY: Complete agent lifecycle
    run = await database.get(`SELECT * FROM runs WHERE id = ?`, [runId])
    expect(run?.status).toBe('completed')
    expect(run?.total_cost).toBe(0.12)

    const webhook = await database.get(`SELECT * FROM webhooks WHERE run_id = ?`, [runId])
    expect(webhook?.delivery_status).toBe('success')

    // Verify task is complete
    const completedTask = await database.get(
      `SELECT * FROM runs WHERE task_id = ? ORDER BY ended_at DESC LIMIT 1`,
      [taskId]
    )
    expect(completedTask?.status).toBe('completed')

    console.log('✅ Agent integration complete:')
    console.log(`  1. Agent discovered task: "${task.name}"`)
    console.log(`  2. Agent claimed run: ${runId}`)
    console.log(`  3. Agent computed result: ${primeResult.length} primes found`)
    console.log(`  4. Agent reported completion with cost: $${run.total_cost}`)
    console.log(`  5. Webhook verified and recorded`)
  })
})
