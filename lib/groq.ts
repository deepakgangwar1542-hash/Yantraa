import { createGroq } from '@ai-sdk/groq'

// Collect every configured Groq API key. Falls back gracefully if some are unset.
const API_KEYS = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3,
].filter((k): k is string => Boolean(k && k.trim()))

// Build one provider per key so we can rotate across them.
const providers = (API_KEYS.length ? API_KEYS : [undefined]).map((apiKey) =>
  createGroq(apiKey ? { apiKey } : {}),
)

let cursor = 0

/**
 * Returns a Groq model, round-robining across all configured API keys
 * (GROQ_API_KEY, GROQ_API_KEY_2, GROQ_API_KEY_3) to spread out rate limits.
 */
export function groqModel(modelId: string) {
  const provider = providers[cursor % providers.length]
  cursor = (cursor + 1) % providers.length
  return provider(modelId)
}
