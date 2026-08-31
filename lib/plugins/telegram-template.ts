// Telegram Plugin Template for Phoenix v3
// This is a reference implementation for creating a Telegram notification plugin

/**
 * Telegram Plugin Example
 *
 * To use this plugin:
 * 1. Create a Telegram bot via @BotFather on Telegram
 * 2. Get your bot token and chat ID
 * 3. Register the plugin with Phoenix:
 *
 * POST /api/plugins
 * {
 *   "name": "telegram-notifications",
 *   "type": "notification",
 *   "config": {
 *     "botToken": "YOUR_BOT_TOKEN",
 *     "chatId": "YOUR_CHAT_ID"
 *   }
 * }
 */

export interface TelegramPluginConfig {
  botToken: string
  chatId: string
  webhookUrl?: string
}

// Send a message via Telegram
export async function sendTelegramMessage(
  config: TelegramPluginConfig,
  message: string,
  parseMode: 'Markdown' | 'HTML' = 'Markdown',
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${config.botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: config.chatId,
          text: message,
          parse_mode: parseMode,
        }),
      },
    )

    return response.ok
  } catch (error) {
    console.error('Failed to send Telegram message:', error)
    return false
  }
}

// Format task completion notification
export function formatTaskCompletionMessage(
  taskName: string,
  agentName: string,
  cost: number,
  duration: number,
): string {
  return `
✅ *Task Completed*

*Task:* ${taskName}
*Agent:* ${agentName}
*Cost:* $${cost.toFixed(2)}
*Duration:* ${duration}s

View in Phoenix: /dashboard
`.trim()
}

// Format task failure notification
export function formatTaskFailureMessage(
  taskName: string,
  agentName: string,
  errorMessage: string,
): string {
  return `
❌ *Task Failed*

*Task:* ${taskName}
*Agent:* ${agentName}
*Error:* ${errorMessage}

Take action: /dashboard
`.trim()
}

// Format budget alert
export function formatBudgetAlertMessage(
  agentName: string,
  spent: number,
  budget: number,
): string {
  const percentUsed = (spent / budget * 100).toFixed(0)
  return `
⚠️ *Budget Alert*

*Agent:* ${agentName}
*Spent:* $${spent.toFixed(2)}
*Budget:* $${budget.toFixed(2)}
*Used:* ${percentUsed}%

Review in: /settings
`.trim()
}

// Example webhook handler for Telegram updates
export async function handleTelegramWebhook(
  body: any,
  phoenixWebhookUrl: string,
): Promise<void> {
  try {
    if (body.message?.text?.startsWith('/')) {
      const command = body.message.text.split(' ')[0]

      // Handle commands
      switch (command) {
        case '/status':
          // Get status from Phoenix and send back
          const statusRes = await fetch(`${phoenixWebhookUrl}/api/costs`)
          const status = await statusRes.json()
          console.log('System status:', status)
          break

        case '/dashboard':
          // Send dashboard link
          console.log('Dashboard link: /dashboard')
          break

        default:
          console.log('Unknown command:', command)
      }
    }
  } catch (error) {
    console.error('Error handling Telegram webhook:', error)
  }
}

/**
 * Plugin Registration Schema
 *
 * {
 *   "name": "telegram-notifications",
 *   "type": "notification",
 *   "description": "Send task notifications to Telegram",
 *   "version": "1.0.0",
 *   "config": {
 *     "botToken": { "type": "string", "required": true, "secret": true },
 *     "chatId": { "type": "string", "required": true },
 *     "webhookUrl": { "type": "string", "required": false }
 *   },
 *   "triggers": [
 *     "task.completed",
 *     "task.failed",
 *     "agent.budget_exceeded"
 *   ]
 * }
 */
