// Provider types - external AI tools (Claude Code, Cursor, Pi, etc.)
export type ProviderType = 'claude-code' | 'cursor' | 'pi' | 'openai-compat' | 'llama-cpp'

export interface Provider {
  id: string
  name: string
  type: ProviderType
  description: string
  configSchema: Record<string, unknown>
  availableModels: string[]
  createdAt: Date
}

// Agent types - personality + provider instance
export interface Agent {
  id: string
  name: string
  description: string
  providerId: string
  model: string
  costBudget: number
  costBudgetCurrency: 'USD' | 'EUR' | 'GBP'
  apiKeyHash: string
  retryPolicy: RetryPolicy
  createdAt: Date
  updatedAt: Date
}

export interface RetryPolicy {
  maxRetries: number
  backoffStrategy: 'exponential' | 'linear' | 'fixed'
  initialDelayMs: number
  maxDelayMs: number
  isIdempotent: boolean
}

// Skill types
export interface Skill {
  id: string
  name: string
  description?: string
  type: 'provider-defined' | 'custom'
  provider: string
  config?: Record<string, unknown>
  createdAt: Date
}

// Task types - unit of work
export type TaskStatus = 'draft' | 'scheduled' | 'running' | 'completed' | 'failed'

export interface Task {
  id: string
  projectId: string
  name: string
  description: string
  agentId: string
  scheduleCron?: string
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

// Run types - execution of a task
export type RunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface Run {
  id: string
  taskId: string
  agentId: string
  status: RunStatus
  startedAt?: Date
  endedAt?: Date
  totalCost: number
  costCurrency: 'USD' | 'EUR' | 'GBP'
  snapshotPath?: string
  createdAt: Date
}

// Webhook payload from agents
export interface WebhookPayload {
  runId: string
  status: RunStatus
  logs: string[]
  artifacts: WebhookArtifact[]
  cost: number
  timestamp: Date
  agentState?: Record<string, unknown>
}

export interface WebhookArtifact {
  name: string
  path: string
  type: string
  size: number
}

// Project types
export interface Project {
  id: string
  name: string
  description?: string
  baseDirectory: string
  totalCost: number
  totalBudget?: number
  createdAt: Date
  updatedAt: Date
}

// API Key types
export interface ApiKey {
  id: string
  agentId: string
  keyHash: string
  createdAt: Date
  lastUsedAt?: Date
  revokedAt?: Date
}

// Cost types
export interface CostLog {
  id: string
  runId: string
  providerId: string
  amount: number
  currency: 'USD' | 'EUR' | 'GBP'
  timestamp: Date
}

// Recovery types
export interface RecoverySnapshot {
  id: string
  runId: string
  snapshotDir: string
  stateMetadata: Record<string, unknown>
  createdAt: Date
}
