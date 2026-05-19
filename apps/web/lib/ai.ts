import Anthropic from '@anthropic-ai/sdk'

// Single Anthropic client — shared across classifier and all agent runners.
// Rotating the API key or switching models requires changing one file.
export const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const MODELS = {
  classifier: 'claude-haiku-4-5-20251001',
  agent:      'claude-opus-4-7',
} as const
