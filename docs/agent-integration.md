# Agent Integration Guide

How external agents (Claude Code, Cursor, etc.) discover and execute tasks in Phoenix v3.

## Agent Lifecycle

```
1. DISCOVER  → Poll for pending tasks
2. CLAIM     → Create a run (mark task as claimed)
3. EXECUTE   → Read description, do the work
4. REPORT    → Send webhook with results
```

## API Reference

### 1. Discover Pending Tasks

```bash
GET /api/agent/tasks?agentId={agent_id}
```

**Response:**
```json
{
  "agent": {
    "id": "agent_xyz",
    "name": "Claude Code",
    "provider": "claude-code",
    "model": "claude-opus-5"
  },
  "tasks": [
    {
      "id": "task_1",
      "name": "Research AI Trends",
      "description": "Investigate latest AI developments and create summary report",
      "project": {
        "id": "proj_1",
        "name": "Research Project",
        "directory": "/Users/me/.phoenix/research"
      },
      "createdAt": 1788197805
    }
  ],
  "taskCount": 1
}
```

**What the agent does:**
1. Read `task.description` — this is the specification
2. Understand what work is needed
3. Determine if agent can do it (language, skills, etc.)

### 2. Claim the Task

```bash
POST /api/agent/runs
Content-Type: application/json

{
  "agentId": "agent_xyz",
  "taskId": "task_1"
}
```

**Response:**
```json
{
  "runId": "run_abc123",
  "taskId": "task_1",
  "taskName": "Research AI Trends",
  "taskDescription": "Investigate latest AI developments...",
  "status": "running",
  "startedAt": 1788197810
}
```

**What this does:**
- Creates a run record (prevents other agents from claiming same task)
- Returns full task details for agent to work on
- Task is now marked as `status: running` in UI

**If task already claimed:**
```json
{
  "error": "Task already has an active run",
  "runId": "run_existing"
}
```

### 3. Execute the Task

The agent now does the actual work. Examples:

**Task: "Write a report on quantum computing"**
- Agent researches quantum computing
- Writes markdown or PDF report
- Saves to project directory
- Captures any output/logs

**Task: "Calculate prime numbers between 1 and 100"**
- Agent computes the list
- Formats as JSON
- Prepares result for webhook

**Task: "Code review the PR"**
- Agent reviews code
- Creates detailed feedback
- Prepares report

## 4. Report Completion

```bash
POST /api/webhooks
Authorization: Bearer {api_key}
Content-Type: application/json

{
  "runId": "run_abc123",
  "status": "completed",
  "logs": "Task completed successfully. Found 25 primes.",
  "cost": 0.12,
  "artifacts": [
    {
      "type": "file",
      "path": "/Users/me/.phoenix/research/report.md",
      "name": "research_report.md"
    }
  ]
}
```

**Required fields:**
- `runId` — matches the run created earlier
- `status` — "completed" or "failed"

**Optional fields:**
- `cost` — estimated API usage cost
- `logs` — execution logs or summary
- `artifacts` — files generated (saved separately to project dir)

**API Key Authentication:**
- Agent must have Bearer token (API key)
- System verifies key belongs to this agent
- Keys are hashed in database

### If Task Failed

```bash
POST /api/webhooks
Authorization: Bearer {api_key}

{
  "runId": "run_abc123",
  "status": "failed",
  "logs": "Failed to connect to API: timeout after 30s",
  "cost": 0.02
}
```

## Polling Strategy

**Simple polling (recommended for testing):**
```
Every 5-10 seconds:
  GET /api/agent/tasks?agentId={id}
  If taskCount > 0:
    Pick first task
    POST /api/agent/runs to claim it
    Execute task
    POST /api/webhooks to report
  Sleep until next poll
```

**Production recommendations:**
- Start with short poll interval (5s) during active work
- Increase interval (30-60s) when no tasks
- Batch multiple tasks if possible
- Use exponential backoff for errors

## Error Handling

| Error | Action |
|-------|--------|
| Task not found | Task was deleted, move on |
| Task already has active run | Another agent claimed it, fetch new task list |
| Agent over budget | Stop accepting new tasks, report to admin |
| Webhook 401 Unauthorized | Invalid/revoked API key, cannot report |
| Webhook 500 | Retry exponentially, log for debugging |

## Example Agent Implementation

```python
import requests
import time
from datetime import datetime

class PhoenixAgent:
    def __init__(self, agent_id, api_key, base_url="http://localhost:3000"):
        self.agent_id = agent_id
        self.api_key = api_key
        self.base_url = base_url

    def discover_tasks(self):
        """Poll for pending tasks"""
        response = requests.get(
            f"{self.base_url}/api/agent/tasks",
            params={"agentId": self.agent_id}
        )
        if response.status_code == 200:
            return response.json()["tasks"]
        return []

    def claim_task(self, task_id):
        """Claim a task and create a run"""
        response = requests.post(
            f"{self.base_url}/api/agent/runs",
            json={"agentId": self.agent_id, "taskId": task_id}
        )
        if response.status_code == 201:
            return response.json()
        return None

    def report_completion(self, run_id, status, logs, cost=0, artifacts=None):
        """Report task completion via webhook"""
        response = requests.post(
            f"{self.base_url}/api/webhooks",
            headers={"Authorization": f"Bearer {self.api_key}"},
            json={
                "runId": run_id,
                "status": status,
                "logs": logs,
                "cost": cost,
                "artifacts": artifacts or []
            }
        )
        return response.status_code == 200

    def run_forever(self):
        """Main agent loop"""
        while True:
            tasks = self.discover_tasks()
            
            if not tasks:
                print("No tasks available, waiting...")
                time.sleep(10)
                continue

            for task in tasks:
                print(f"Found task: {task['name']}")
                
                # Claim the task
                run = self.claim_task(task["id"])
                if not run:
                    print(f"Could not claim task (already claimed?)")
                    continue

                print(f"Claimed run: {run['runId']}")
                
                # Execute task (agent-specific logic)
                logs, cost = self.execute_task(task)
                
                # Report completion
                success = self.report_completion(
                    run["runId"],
                    "completed",
                    logs,
                    cost
                )
                
                if success:
                    print(f"Task {task['id']} completed and reported")
                else:
                    print(f"Failed to report completion for {task['id']}")

    def execute_task(self, task):
        """Override this to implement actual task execution"""
        # Example: read description and do something
        description = task["description"]
        print(f"Executing: {description}")
        
        # Do the actual work...
        logs = f"Completed task: {description}"
        cost = 0.05  # Estimated cost
        
        return logs, cost

# Usage
if __name__ == "__main__":
    agent = PhoenixAgent(
        agent_id="agent_xyz",
        api_key="pk_your_api_key_here"
    )
    agent.run_forever()
```

## Testing

Run the test suite to verify your agent integration:

```bash
npm test -- agent
```

Tests cover:
- ✅ Task discovery
- ✅ Task claiming
- ✅ Duplicate prevention
- ✅ Cost tracking
- ✅ Webhook authentication

## FAQ

**Q: What if my task takes longer than expected?**
A: Run stays in `status: running` until webhook is received. No timeout (yet).

**Q: Can multiple agents work on same project?**
A: Yes, each agent gets its own pending task list and can claim independently.

**Q: What if agent crashes mid-task?**
A: Run stays in `running` state indefinitely. Admin can manually mark failed or retry.

**Q: How do I get an API key for my agent?**
A: API keys are created when agent is created via POST `/api/agents`.

**Q: Can I change task while running?**
A: No, task description is immutable. Create new task if requirements change.
