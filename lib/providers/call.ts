// Shared provider-calling logic used by both the "Test Connection" endpoint
// and the task executor's agent-based execution path.

import { spawn } from 'child_process'
import { estimateClaudeCost } from '@/lib/cost/pricing'

export interface ProviderCallConfig {
  apiKey: string
  endpoint?: string
  model?: string
  binaryPath?: string
}

export interface ProviderCallResult {
  success: boolean
  text?: string
  model?: string
  error?: string
  cost?: number
}

export interface ProviderCallOptions {
  webSearch?: boolean
}

export async function callProvider(
  type: string,
  config: ProviderCallConfig,
  input: { system?: string; user: string },
  options: ProviderCallOptions = {},
): Promise<ProviderCallResult> {
  switch (type) {
    case 'claude-code':
      return callClaude(config, input, options)
    case 'openai-compat':
      return callOpenAI(config, input)
    case 'pi':
      return callPi(config, input)
    default:
      return { success: false, error: `Unsupported provider type: ${type}` }
  }
}

async function callClaude(
  config: ProviderCallConfig,
  input: { system?: string; user: string },
  options: ProviderCallOptions = {},
): Promise<ProviderCallResult> {
  try {
    if (!config.apiKey) {
      return { success: false, error: 'API key required' }
    }

    const model = config.model || 'claude-opus-5'

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        // Web search runs server-side inside the same request, but leaves less
        // room for the model's own synthesis - give it more headroom when on.
        max_tokens: options.webSearch ? 8192 : 4096,
        ...(input.system ? { system: input.system } : {}),
        ...(options.webSearch
          ? { tools: [{ type: 'web_search_20260209', name: 'web_search' }] }
          : {}),
        messages: [{ role: 'user', content: input.user }],
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.error?.message || 'Claude API error', model }
    }

    const data = await response.json()
    // content can include non-text blocks (e.g. thinking) before the text block -
    // gather every text block rather than assuming content[0] is the answer
    const text = (data.content || [])
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n')
      .trim()

    if (!text) {
      return {
        success: false,
        error: `No text content in response (stop_reason: ${data.stop_reason || 'unknown'})`,
        model,
      }
    }

    const cost = data.usage
      ? estimateClaudeCost(model, data.usage.input_tokens || 0, data.usage.output_tokens || 0)
      : undefined

    return { success: true, text, model, cost }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

async function callOpenAI(
  config: ProviderCallConfig,
  input: { system?: string; user: string },
): Promise<ProviderCallResult> {
  try {
    if (!config.apiKey || !config.endpoint) {
      return { success: false, error: 'API key and endpoint required' }
    }

    const model = config.model || 'gpt-4'
    const endpoint = config.endpoint.replace(/\/$/, '')

    const messages: Array<{ role: string; content: string }> = []
    if (input.system) {
      messages.push({ role: 'system', content: input.system })
    }
    messages.push({ role: 'user', content: input.user })

    const response = await fetch(`${endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, messages, max_tokens: 4096 }),
    })

    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.error?.message || 'OpenAI API error', model }
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || ''

    return { success: true, text, model }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

async function callPi(
  config: ProviderCallConfig,
  input: { system?: string; user: string },
): Promise<ProviderCallResult> {
  try {
    const binaryPath = config.binaryPath || 'pi'
    const model = config.model || ''

    // Build prompt text
    const promptText = input.user

    // Build pi CLI arguments
    const args = ['--print', '--mode', 'json']

    if (model) {
      args.push('--model', model)
    }
    if (input.system) {
      args.push('--system-prompt', input.system)
    }
    args.push('--no-session')

    // Execute pi CLI and collect output
    const output = await executePiCommand(binaryPath, args, promptText)

    if (!output) {
      return { success: false, error: 'No output from pi' }
    }

    return { success: true, text: output, model }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

function executePiCommand(
  binaryPath: string,
  args: string[],
  stdin: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(binaryPath, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    proc.on('error', (error) => {
      reject(new Error(`Failed to execute pi: ${error.message}`))
    })

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`pi exited with code ${code}: ${stderr}`))
        return
      }

      // Parse NDJSON output and extract text content
      const text = parseNDJSON(stdout)
      resolve(text)
    })

    // Send prompt via stdin
    proc.stdin.write(stdin)
    proc.stdin.end()
  })
}

interface PiEvent {
  type?: string
  assistantMessageEvent?: {
    type?: string
    delta?: string
  }
  message?: {
    role?: string
    content?: Array<{ type?: string; text?: string }>
  }
}

function parseNDJSON(output: string): string {
  const lines = output.split('\n').filter((line) => line.trim())
  let textContent = ''

  for (const line of lines) {
    try {
      const event = JSON.parse(line) as PiEvent

      // Collect text from message_update events
      if (event.type === 'message_update' && event.assistantMessageEvent?.type === 'text_delta') {
        textContent += event.assistantMessageEvent.delta || ''
      }
    } catch {
      // Skip non-JSON lines (e.g., deprecation warnings)
      continue
    }
  }

  return textContent.trim()
}
