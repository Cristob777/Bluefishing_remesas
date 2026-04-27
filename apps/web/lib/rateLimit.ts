import { NextRequest, NextResponse } from 'next/server'

// In-memory store — resets on cold start.
// For persistent limits at scale, swap to Upstash Redis.

interface Window {
  count:   number
  resetAt: number
}

const stores: Record<string, Map<string, Window>> = {}

interface LimitConfig {
  max:        number   // max requests per window
  windowMs:   number   // window duration in ms
  namespace:  string   // isolate limits per route group
}

const PRESETS = {
  action:  { max: 30,  windowMs: 60_000, namespace: 'action' },   // mutations
  read:    { max: 120, windowMs: 60_000, namespace: 'read' },     // GET queries
  webhook: { max: 20,  windowMs: 60_000, namespace: 'webhook' },  // external triggers
}

export type LimitPreset = keyof typeof PRESETS

function checkLimit(key: string, config: LimitConfig): { allowed: boolean; retryAfter?: number } {
  if (!stores[config.namespace]) stores[config.namespace] = new Map()
  const store = stores[config.namespace]
  const now   = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs })
    return { allowed: true }
  }

  if (entry.count >= config.max) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }

  entry.count++
  return { allowed: true }
}

export function getClientIp(req: NextRequest): string {
  // x-forwarded-for can be spoofed — Vercel sets x-real-ip from the edge
  return (
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    'unknown'
  )
}

export function rateLimit(
  req: NextRequest,
  preset: LimitPreset = 'action',
  userKey?: string,
): NextResponse | null {
  const config = PRESETS[preset]
  const key    = userKey ?? getClientIp(req)
  const result = checkLimit(key, config)

  if (!result.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before retrying.' },
      {
        status:  429,
        headers: { 'Retry-After': String(result.retryAfter ?? 60) },
      },
    )
  }
  return null
}
