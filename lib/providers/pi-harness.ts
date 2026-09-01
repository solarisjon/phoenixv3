// Pi harness utilities for discovering available models and tools

import { spawn } from 'child_process'

export async function listPiModels(binaryPath: string = 'pi'): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const proc = spawn(binaryPath, ['--list-models'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let output = ''
    let stderr = ''

    proc.stdout.on('data', (data) => {
      output += data.toString()
    })

    proc.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    proc.on('error', (error) => {
      reject(new Error(`Failed to list models: ${error.message}`))
    })

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`pi --list-models failed: ${stderr}`))
        return
      }

      const models = parseModelsOutput(output)
      resolve(models)
    })
  })
}

export async function listPiTools(binaryPath: string = 'pi'): Promise<PiTool[]> {
  return new Promise((resolve, reject) => {
    const proc = spawn(binaryPath, ['--list-tools'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let output = ''
    let stderr = ''

    proc.stdout.on('data', (data) => {
      output += data.toString()
    })

    proc.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    proc.on('error', (error) => {
      reject(new Error(`Failed to list tools: ${error.message}`))
    })

    proc.on('close', (code) => {
      if (code !== 0) {
        // Tools might not be available, return empty list instead of failing
        resolve([])
        return
      }

      const tools = parseToolsOutput(output)
      resolve(tools)
    })
  })
}

export interface PiTool {
  id: string
  name: string
  description?: string
  category?: string
}

function parseModelsOutput(output: string): string[] {
  const models: string[] = []
  const lines = output.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip empty lines, header, and deprecation warnings
    if (
      !trimmed ||
      trimmed.startsWith('provider') ||
      trimmed.startsWith('Deprecation') ||
      trimmed.startsWith('WARN')
    ) {
      continue
    }

    // Parse tabular output: "provider  model  context  max-out  thinking  images"
    const fields = trimmed.split(/\s+/)
    if (fields.length >= 2) {
      // Model is typically the second column
      const model = fields[1]
      if (model && !models.includes(model)) {
        models.push(model)
      }
    }
  }

  return models
}

function parseToolsOutput(output: string): PiTool[] {
  const tools: PiTool[] = []
  const lines = output.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('Tool') || trimmed.startsWith('---')) {
      continue
    }

    // Try to parse tool definition (format may vary)
    // Fallback: treat each non-empty line as a tool name
    const parts = trimmed.split(/\s+/, 1)
    if (parts[0]) {
      tools.push({
        id: parts[0].toLowerCase().replace(/\s+/g, '-'),
        name: parts[0],
        description: trimmed.substring(parts[0].length).trim() || undefined,
      })
    }
  }

  return tools
}
