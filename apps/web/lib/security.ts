import { NextRequest } from 'next/server'
import type { WebhookEmailPayload } from '@/types'

// ── Rate limiting (in-memory, resets on cold start) ──────────────────────────
// Para producción con alto volumen, reemplazar con Vercel KV o Upstash Redis.

interface RateWindow {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateWindow>()
const RATE_LIMIT_MAX   = 20   // max requests por ventana
const RATE_LIMIT_WINDOW = 60_000 // 60 segundos

export function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
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

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

// ── Webhook payload validation ───────────────────────────────────────────────

const EMAIL_RE    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_BODY_LEN = 50_000  // 50 KB
const MAX_ATTACH_LEN = 200_000  // 200 KB

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

// ── Sanitize text fields (strip null bytes, control chars) ───────────────────

export function sanitizePayload(payload: WebhookEmailPayload): WebhookEmailPayload {
  const clean = (s: string) => s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  return {
    ...payload,
    email_id:           clean(payload.email_id),
    email_from:         clean(payload.email_from).toLowerCase(),
    email_subject:      clean(payload.email_subject),
    email_body:         clean(payload.email_body),
    attachment_text:    payload.attachment_text   ? clean(payload.attachment_text)   : undefined,
    attachment_filename: payload.attachment_filename ? clean(payload.attachment_filename) : undefined,
  }
}

// ── Timing-safe string comparison (prevent timing attacks on secrets) ─────────

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}
