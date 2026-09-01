// Shared provider-calling logic used by both the "Test Connection" endpoint
// and the task executor's agent-based execution path.

export interface ProviderCallConfig {
  apiKey: string
  endpoint?: string
  model?: string
}

export interface ProviderCallResult {
  success: boolean
  text?: string
  model?: string
  error?: string
}

export async function callProvider(
  type: string,
  config: ProviderCallConfig,
  input: { system?: string; user: string },
): Promise<ProviderCallResult> {
  switch (type) {
    case 'claude-code':
      return callClaude(config, input)
    case 'openai-compat':
      return callOpenAI(config, input)
    case 'pi':
      return { success: false, error: 'Pi provider not yet implemented' }
    default:
      return { success: false, error: `Unsupported provider type: ${type}` }
  }
}

async function callClaude(
  config: ProviderCallConfig,
  input: { system?: string; user: string },
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
        max_tokens: 4096,
        ...(input.system ? { system: input.system } : {}),
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

    return { success: true, text, model }
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
