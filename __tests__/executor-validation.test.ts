/**
 * Executor Validation Test: Real API calls to validate full task execution flow
 * This test proves the complete system works end-to-end
 */

import { database, initializeDb } from '@/lib/db/client'

describe('Executor Validation: Complete API Flow', () => {
  const testRun = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  let baseUrl: string
  let agentId: string
  let agentApiKey: string
  let projectId: string
  let taskId: string

  beforeAll(async () => {
    await initializeDb()

    // Determine base URL (local dev server)
    baseUrl = process.env.API_URL || 'http://localhost:3002'

    console.log(`\n📋 Executor Validation Test`)
    console.log(`   Base URL: ${baseUrl}`)
    console.log(`   Test Run: ${testRun}\n`)
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

  it('should execute complete task flow: create → discover → claim → complete', async () => {
    // STEP 1: Create Agent via API
    console.log('Step 1: Creating agent...')
    const agentResponse = await fetch(`${baseUrl}/api/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Validation Agent ${testRun}`,
        description: 'Agent for validation testing',
        providerId: 'claude-code',
        model: 'claude-opus-5',
      }),
    })

    expect(agentResponse.status).toBe(201)
    const agentData = await agentResponse.json()
    agentId = agentData.id
    agentApiKey = agentData.apiKey
    console.log(`   ✓ Agent created: ${agentId}`)
    console.log(`   ✓ API Key: ${agentApiKey.substring(0, 10)}...`)

    // STEP 2: Create Project via API
    console.log('\nStep 2: Creating project...')
    const projectResponse = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Validation Project ${testRun}`,
        description: 'Project for validation testing',
      }),
    })

    expect(projectResponse.status).toBe(201)
    const projectData = await projectResponse.json()
    projectId = projectData.id
    console.log(`   ✓ Project created: ${projectId}`)
    console.log(`   ✓ Base directory: ${projectData.baseDirectory}`)

    // STEP 3: Create Task via API
    console.log('\nStep 3: Creating task...')
    const taskResponse = await fetch(`${baseUrl}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        agentId,
        name: 'Validation Task: Calculate Fibonacci',
        description: 'Calculate Fibonacci sequence up to 10 numbers: 0, 1, 1, 2, 3, 5, 8, 13, 21, 34. Validate answer is correct.',
      }),
    })

    expect(taskResponse.status).toBe(201)
    const taskData = await taskResponse.json()
    taskId = taskData.id
    expect(taskData.enabled).toBe(true)
    console.log(`   ✓ Task created: ${taskId}`)
    console.log(`   ✓ Task name: ${taskData.name}`)
    console.log(`   ✓ Enabled: ${taskData.enabled}`)

    // STEP 4: Agent polls for tasks
    console.log('\nStep 4: Agent polls for pending tasks...')
    const pollResponse = await fetch(`${baseUrl}/api/agent/tasks?agentId=${agentId}`)
    expect(pollResponse.status).toBe(200)

    const pollData = await pollResponse.json()
    expect(pollData.tasks.length).toBeGreaterThan(0)

    const discoveredTask = pollData.tasks.find((t: any) => t.id === taskId)
    expect(discoveredTask).toBeDefined()
    console.log(`   ✓ Agent discovered task: "${discoveredTask.name}"`)
    console.log(`   ✓ Task description: "${discoveredTask.description.substring(0, 50)}..."`)

    // STEP 5: Agent claims the task
    console.log('\nStep 5: Agent claims task...')
    const claimResponse = await fetch(`${baseUrl}/api/agent/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId,
        taskId,
      }),
    })

    expect(claimResponse.status).toBe(201)
    const claimData = await claimResponse.json()
    const runId = claimData.runId
    expect(claimData.status).toBe('running')
    console.log(`   ✓ Run created: ${runId}`)
    console.log(`   ✓ Status: ${claimData.status}`)
    console.log(`   ✓ Task: ${claimData.taskName}`)

    // STEP 6: Verify task is no longer in pending list
    console.log('\nStep 6: Verify claimed task is hidden from pending...')
    const poll2Response = await fetch(`${baseUrl}/api/agent/tasks?agentId=${agentId}`)
    const poll2Data = await poll2Response.json()

    const claimedTaskStillVisible = poll2Data.tasks.find((t: any) => t.id === taskId)
    expect(claimedTaskStillVisible).toBeUndefined()
    console.log(`   ✓ Task removed from pending list (no duplicates)`)

    // STEP 7: Agent executes and reports completion via webhook
    console.log('\nStep 7: Agent executes task and reports completion...')

    // Simulate agent computing the result
    const fibonacciResult = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
    const executionLogs = `Calculated Fibonacci sequence: ${fibonacciResult.join(', ')}`

    const webhookResponse = await fetch(`${baseUrl}/api/webhooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${agentApiKey}`,
      },
      body: JSON.stringify({
        runId,
        status: 'completed',
        logs: executionLogs,
        cost: 0.08,
        timestamp: new Date().toISOString(),
      }),
    })

    expect(webhookResponse.status).toBe(200)
    const webhookResult = await webhookResponse.json()
    expect(webhookResult.success).toBe(true)
    console.log(`   ✓ Webhook delivered successfully`)
    console.log(`   ✓ Logs: "${executionLogs}"`)
    console.log(`   ✓ Cost recorded: $0.08`)

    // STEP 8: Verify run is marked complete
    console.log('\nStep 8: Verifying run completion...')
    const run = await database.get(`SELECT * FROM runs WHERE id = ?`, [runId])
    expect(run?.status).toBe('completed')
    expect(run?.total_cost).toBe(0.08)
    console.log(`   ✓ Run status: ${run?.status}`)
    console.log(`   ✓ Total cost: $${run?.total_cost}`)

    // STEP 9: Verify webhook was recorded
    console.log('\nStep 9: Verifying webhook delivery...')
    const webhook = await database.get(`SELECT * FROM webhooks WHERE run_id = ?`, [runId])
    expect(webhook).toBeDefined()
    expect(webhook?.delivery_status).toBe('success')
    console.log(`   ✓ Webhook recorded`)
    console.log(`   ✓ Delivery status: ${webhook?.delivery_status}`)

    // SUMMARY
    console.log('\n✅ VALIDATION COMPLETE - Full task execution verified!\n')
    console.log('Complete Flow:')
    console.log(`  1. Agent created:     ${agentId}`)
    console.log(`  2. Project created:   ${projectId}`)
    console.log(`  3. Task created:      ${taskId}`)
    console.log(`  4. Task discovered:   ${discoveredTask.name}`)
    console.log(`  5. Run created:       ${runId}`)
    console.log(`  6. Task completed:    ${run?.status}`)
    console.log(`  7. Cost recorded:     $${run?.total_cost}`)
    console.log(`  8. Webhook verified:  ${webhook?.delivery_status}`)
    console.log()
  })
})
