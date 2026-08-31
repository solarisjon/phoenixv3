// SQLite schema definition for Phoenix v3

export const schema = `
-- Providers: External AI tools (Claude Code, Cursor, Pi, etc.)
CREATE TABLE IF NOT EXISTS providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK(type IN ('claude-code', 'cursor', 'pi', 'openai-compat', 'llama-cpp')),
  description TEXT,
  config_schema TEXT NOT NULL DEFAULT '{}',
  available_models TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Projects: Outcome/deliverable
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  base_directory TEXT NOT NULL,
  total_cost REAL NOT NULL DEFAULT 0,
  total_budget REAL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Agents: Personality + provider instance
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  provider_id TEXT NOT NULL REFERENCES providers(id),
  model TEXT NOT NULL,
  cost_budget REAL NOT NULL DEFAULT 1000,
  cost_budget_currency TEXT NOT NULL DEFAULT 'USD' CHECK(cost_budget_currency IN ('USD', 'EUR', 'GBP')),
  api_key_hash TEXT NOT NULL UNIQUE,
  retry_policy TEXT NOT NULL DEFAULT '{"maxRetries": 3, "backoffStrategy": "exponential", "initialDelayMs": 1000, "maxDelayMs": 30000, "isIdempotent": false}',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Skills: Provider-defined or custom
CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK(type IN ('provider-defined', 'custom')),
  provider TEXT NOT NULL,
  config TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  UNIQUE(name, provider, type)
);

-- Agent-Skill mapping
CREATE TABLE IF NOT EXISTS agent_skills (
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  assigned_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  PRIMARY KEY (agent_id, skill_id)
);

-- Tasks: Unit of work
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  agent_id TEXT NOT NULL REFERENCES agents(id),
  schedule_cron TEXT,
  enabled BOOLEAN NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  UNIQUE(project_id, name)
);

-- Runs: Execution of a task
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL REFERENCES agents(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  started_at INTEGER,
  ended_at INTEGER,
  total_cost REAL NOT NULL DEFAULT 0,
  cost_currency TEXT NOT NULL DEFAULT 'USD' CHECK(cost_currency IN ('USD', 'EUR', 'GBP')),
  snapshot_path TEXT,
  original_run_id TEXT,
  retry_count INTEGER DEFAULT 0,
  retry_delay_ms INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Webhooks: Inbound updates from agents
CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  payload_hash TEXT NOT NULL UNIQUE,
  timestamp INTEGER NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'success' CHECK(delivery_status IN ('success', 'failed', 'pending'))
);

-- Cost logs: Detailed cost tracking
CREATE TABLE IF NOT EXISTS cost_logs (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL REFERENCES providers(id),
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD' CHECK(currency IN ('USD', 'EUR', 'GBP')),
  timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- API Keys: Agent authentication
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  last_used_at INTEGER,
  revoked_at INTEGER
);

-- Recovery snapshots: State preservation for resumable tasks
CREATE TABLE IF NOT EXISTS recovery_snapshots (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  snapshot_dir TEXT NOT NULL UNIQUE,
  state_metadata TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_agent_id ON tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_runs_task_id ON runs(task_id);
CREATE INDEX IF NOT EXISTS idx_runs_agent_id ON runs(agent_id);
CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);
CREATE INDEX IF NOT EXISTS idx_cost_logs_run_id ON cost_logs(run_id);
CREATE INDEX IF NOT EXISTS idx_cost_logs_provider_id ON cost_logs(provider_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_agent_id ON api_keys(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_skills_agent_id ON agent_skills(agent_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_run_id ON webhooks(run_id);
CREATE INDEX IF NOT EXISTS idx_recovery_snapshots_run_id ON recovery_snapshots(run_id);
`;

// Initialize built-in providers
export const builtInProviders = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    type: 'claude-code',
    description: 'Claude Code local IDE',
    configSchema: {
      endpoint: { type: 'string', default: 'http://localhost:11435' },
    },
    availableModels: ['claude-opus-5', 'claude-sonnet-5'],
  },
  {
    id: 'cursor',
    name: 'Cursor',
    type: 'cursor',
    description: 'Cursor AI IDE',
    configSchema: {
      endpoint: { type: 'string' },
      apiKey: { type: 'string' },
    },
    availableModels: ['claude-3.5-sonnet', 'gpt-4o'],
  },
  {
    id: 'pi',
    name: 'Pi',
    type: 'pi',
    description: 'Anthropic Pi',
    configSchema: {
      endpoint: { type: 'string' },
      apiKey: { type: 'string' },
    },
    availableModels: ['claude-opus-5', 'claude-sonnet-5', 'claude-haiku-4.5'],
  },
  {
    id: 'openai-compat',
    name: 'OpenAI Compatible',
    type: 'openai-compat',
    description: 'OpenAI-compatible endpoint',
    configSchema: {
      endpoint: { type: 'string' },
      apiKey: { type: 'string' },
    },
    availableModels: [],
  },
  {
    id: 'llama-cpp',
    name: 'Llama.cpp Local',
    type: 'llama-cpp',
    description: 'Local Llama.cpp instance (free)',
    configSchema: {
      endpoint: { type: 'string', default: 'http://localhost:8000' },
    },
    availableModels: [],
  },
];
