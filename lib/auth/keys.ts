import crypto from 'crypto'

// Generate cryptographically secure API key for an agent
export function generateApiKey(): { key: string; hash: string } {
  const key = crypto.randomBytes(32).toString('hex')
  const hash = hashApiKey(key)
  return { key, hash }
}

// Hash API key for secure storage
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

// Verify API key against stored hash
export function verifyApiKey(key: string, hash: string): boolean {
  const computedHash = hashApiKey(key)
  return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(hash))
}

// Extract API key from Authorization header
export function extractApiKeyFromHeader(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.slice(7)
}

// Generate HMAC signature for webhook verification
export function generateWebhookSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

// Verify webhook signature
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const expectedSignature = generateWebhookSignature(payload, secret)
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
}
