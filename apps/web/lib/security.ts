import { timingSafeEqual as cryptoTimingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import type { WebhookEmailPayload } from '@/types'

// ── Rate limiting (in-memory, resets on cold start) ───────────────────────────
// For persistent limits at scale, swap to Upstash Redis.

interface RateWindow {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateWindow>()
const RATE_LIMIT_MAX    = 20
const RATE_LIMIT_WINDOW = 60_000

export function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now      = Date.now()
  const existing = rateLimitStore.get(ip)

  if (!existing || now > existing.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return { allowed: true }
  }

  if (existing.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfter: Math.ceil((existing.resetAt - now) / 1000) }
  }

  existing.count++
  return { allowed: true }
}

// x-real-ip set by Vercel edge — more trustworthy than x-forwarded-for
export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    'unknown'
  )
}

// ── Webhook payload validation ────────────────────────────────────────────────

const EMAIL_RE       = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_BODY_LEN   = 50_000
const MAX_ATTACH_LEN = 200_000

export interface ValidationResult {
  valid: boolean
  error?: string
}

export function validateWebhookPayload(payload: unknown): ValidationResult {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Payload must be a JSON object' }
  }

  const p = payload as Record<string, unknown>

  if (typeof p.email_id !== 'string' || p.email_id.trim().length === 0) {
    return { valid: false, error: 'email_id is required and must be a non-empty string' }
  }

  if (typeof p.email_from !== 'string' || !EMAIL_RE.test(p.email_from)) {
    return { valid: false, error: 'email_from must be a valid email address' }
  }

  if (typeof p.email_subject !== 'string' || p.email_subject.trim().length === 0) {
    return { valid: false, error: 'email_subject is required' }
  }

  if (typeof p.email_body !== 'string') {
    return { valid: false, error: 'email_body must be a string' }
  }

  if (p.email_body.length > MAX_BODY_LEN) {
    return { valid: false, error: `email_body exceeds max length of ${MAX_BODY_LEN} chars` }
  }

  if (p.attachment_text !== undefined) {
    if (typeof p.attachment_text !== 'string') {
      return { valid: false, error: 'attachment_text must be a string' }
    }
    if (p.attachment_text.length > MAX_ATTACH_LEN) {
      return { valid: false, error: `attachment_text exceeds max length of ${MAX_ATTACH_LEN} chars` }
    }
  }

  if (p.account !== 'sebastian' && p.account !== 'hector') {
    return { valid: false, error: 'account must be "sebastian" or "hector"' }
  }

  return { valid: true }
}

// ── Sanitize text fields (strip null bytes and control chars) ─────────────────

export function sanitizePayload(payload: WebhookEmailPayload): WebhookEmailPayload {
  const clean = (s: string) => s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  return {
    ...payload,
    email_id:            clean(payload.email_id),
    email_from:          clean(payload.email_from).toLowerCase(),
    email_subject:       clean(payload.email_subject),
    email_body:          clean(payload.email_body),
    attachment_text:     payload.attachment_text     ? clean(payload.attachment_text)     : undefined,
    attachment_filename: payload.attachment_filename ? clean(payload.attachment_filename) : undefined,
  }
}

// ── Constant-time string comparison ──────────────────────────────────────────
// Uses Node's crypto.timingSafeEqual to prevent timing attacks.
// Pads to avoid leaking length information when lengths differ.

export function timingSafeEqual(a: string, b: string): boolean {
  try {
    const bufA  = Buffer.from(a, 'utf8')
    const bufB  = Buffer.from(b, 'utf8')
    const maxLen = Math.max(bufA.length, bufB.length)

    // Pad both to the same length — prevents length leak via early return
    const paddedA = Buffer.concat([bufA, Buffer.alloc(maxLen - bufA.length)])
    const paddedB = Buffer.concat([bufB, Buffer.alloc(maxLen - bufB.length)])

    // Always run the comparison (no short-circuit), then apply length equality
    const equal = cryptoTimingSafeEqual(paddedA, paddedB)
    return equal && bufA.length === bufB.length
  } catch {
    return false
  }
}
