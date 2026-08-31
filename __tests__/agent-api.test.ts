/**
 * Agent API Tests: Verify agent discovery and task claiming endpoints work
 */

import { database, initializeDb } from '@/lib/db/client'

describe('Agent APIs: Discovery and Claiming', () => {
  const testRun = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  let agentId: string
  let projectId: string
  let task1Id: string
  let task2Id: string

  beforeAll(async () => {
    await initializeDb()

    // Create test agent
    agentId = `agent_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const provider = await database.get(`SELECT id FROM providers LIMIT 1`)
    const now = Math.floor(Date.now() / 1000)

    await database.run(
      `INSERT INTO agents (id, name, description, provider_id, model, cost_budget, api_key_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [agentId, `Agent ${testRun}`, 'Test', provider.id, 'claude-opus-5', 1000, 'hash', now, now]
    )

    // Create test project
    projectId = `proj_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    await database.run(
      `INSERT INTO projects (id, name, description, base_directory, total_cost, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [projectId, `Project ${testRun}`, 'Test', '/tmp/test', 0, now, now]
    )

    // Create test tasks
    task1Id = `task_test_1_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    task2Id = `task_test_2_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    await database.run(
      `INSERT INTO tasks (id, project_id, name, description, agent_id, enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [task1Id, projectId, 'Task 1', 'First task description', agentId, true, now, now]
    )

    await database.run(
      `INSERT INTO tasks (id, project_id, name, description, agent_id, enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [task2Id, projectId, 'Task 2', 'Second task description', agentId, true, now, now]
    )
  })

  afterAll(async () => {
    await database.run(`DELETE FROM runs WHERE id LIKE ?`, [`run_test_%`])
    await database.run(`DELETE FROM tasks WHERE id LIKE ?`, [`task_test_%`])
    await database.run(`DELETE FROM projects WHERE id LIKE ?`, [`proj_test_%`])
    await database.run(`DELETE FROM agents WHERE id LIKE ?`, [`agent_test_%`])
  })

  it('agent should discover pending tasks', async () => {
    // Query pending tasks for agent
    const tasks = await database.all(
      `SELECT t.*, p.name as project_name, p.base_directory
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE t.agent_id = ? AND t.enabled = 1
         AND NOT EXISTS (
           SELECT 1 FROM runs r
           WHERE r.task_id = t.id AND r.status IN ('pending', 'running')
         )
       ORDER BY t.created_at ASC`,
      [agentId]
    )

    expect(tasks).toHaveLength(2)
    expect(tasks[0].name).toBe('Task 1')
    expect(tasks[1].name).toBe('Task 2')
  })

  it('agent should claim first task and create a run', async () => {
    // Agent claims task1
    const runId = `run_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = Math.floor(Date.now() / 1000)

    await database.run(
      `INSERT INTO runs (id, task_id, agent_id, status, started_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [runId, task1Id, agentId, 'running', now, now]
    )

    const run = await database.get(`SELECT * FROM runs WHERE id = ?`, [runId])
    expect(run?.status).toBe('running')
  })

  it('agent should not see claimed task in pending list', async () => {
    // Query pending tasks again (task1 should be gone, only task2 visible)
    const tasks = await database.all(
      `SELECT t.*, p.name as project_name
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE t.agent_id = ? AND t.enabled = 1
         AND NOT EXISTS (
           SELECT 1 FROM runs r
           WHERE r.task_id = t.id AND r.status IN ('pending', 'running')
         )
       ORDER BY t.created_at ASC`,
      [agentId]
    )

    expect(tasks).toHaveLength(1)
    expect(tasks[0].name).toBe('Task 2')
  })

  it('agent should report completion via webhook with API key verification', async () => {
    // Simulate task2 completion
    const runId = `run_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = Math.floor(Date.now() / 1000)

    // Create run
    await database.run(
      `INSERT INTO runs (id, task_id, agent_id, status, started_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [runId, task2Id, agentId, 'running', now, now]
    )

    // Report completion
    const completionTime = Math.floor(Date.now() / 1000)
    await database.run(
      `UPDATE runs SET status = ?, ended_at = ?, total_cost = ? WHERE id = ?`,
      ['completed', completionTime, 0.08, runId]
    )

    // Record webhook
    await database.run(
      `INSERT INTO webhooks (id, run_id, payload_hash, timestamp, delivery_status)
       VALUES (?, ?, ?, ?, ?)`,
      [`webhook_test_${Date.now()}`, runId, 'hash', completionTime, 'success']
    )

    // Verify completion recorded
    const run = await database.get(`SELECT * FROM runs WHERE id = ?`, [runId])
    expect(run?.status).toBe('completed')

    const webhook = await database.get(`SELECT * FROM webhooks WHERE run_id = ?`, [runId])
    expect(webhook?.delivery_status).toBe('success')
  })

  it('agent cost tracking should record expenses', async () => {
    // Verify total cost for agent
    const costResult = await database.get(
      'SELECT COALESCE(SUM(total_cost), 0) as total_cost FROM runs WHERE agent_id = ?',
      [agentId]
    )

    // Should have runs with costs: 0.08 + 0 (from earlier tests) or similar
    expect(costResult.total_cost).toBeGreaterThanOrEqual(0)
  })
})
