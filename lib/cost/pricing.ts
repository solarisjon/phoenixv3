// USD price per 1M tokens, for models this system can execute directly
// (see lib/db/schema.ts builtInProviders -> availableModels).
// Source: Anthropic first-party API rates.
interface ModelRate {
  inputPerMillion: number
  outputPerMillion: number
}

const CLAUDE_RATES: Record<string, ModelRate> = {
  'claude-opus-5': { inputPerMillion: 5.0, outputPerMillion: 25.0 },
  'claude-sonnet-5': { inputPerMillion: 2.0, outputPerMillion: 10.0 },
  'claude-haiku-4.5': { inputPerMillion: 1.0, outputPerMillion: 5.0 },
  'claude-haiku-4-5': { inputPerMillion: 1.0, outputPerMillion: 5.0 },
}

export function estimateClaudeCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number | undefined {
  const rate = CLAUDE_RATES[model]
  if (!rate) {
    console.warn(`No pricing data for model "${model}" - cost will not be recorded`)
    return undefined
  }

  return (
    (inputTokens / 1_000_000) * rate.inputPerMillion +
    (outputTokens / 1_000_000) * rate.outputPerMillion
  )
}
