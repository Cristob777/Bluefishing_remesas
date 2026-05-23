import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { withRole, readJsonBody, type AuthUser } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'
import { safeError } from '@/lib/errors'
import { classifyEmail } from '@/lib/email-classifier'
import { categoryToAgent } from '@/lib/managed-agents'
import type { WebhookEmailPayload } from '@/types'

const TestClassifierSchema = z.object({
  email_from:          z.string().email().max(320),
  email_subject:       z.string().min(1).max(500),
  email_body:          z.string().min(1).max(20_000),
  attachment_filename: z.string().max(500).optional(),
  attachment_text:     z.string().max(40_000).optional(),
  account:             z.string().min(1).max(80).default('ops'),
})

function senderAllowed(email: string) {
  const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS ?? '')
    .split(',')
    .map(domain => domain.trim().toLowerCase())
    .filter(Boolean)

  if (allowedDomains.length === 0) {
    return { allowed: true, configured_domains: [] as string[] }
  }

  const senderDomain = email.split('@')[1]?.toLowerCase() ?? ''
  return {
    allowed: allowedDomains.some(domain => senderDomain === domain || senderDomain.endsWith(`.${domain}`)),
    configured_domains: allowedDomains,
  }
}

export const POST = withRole(['owner', 'finance'], async (req: NextRequest, user: AuthUser) => {
  const limited = rateLimit(req, 'action', user.id)
  if (limited) return limited

  try {
    const body = await readJsonBody(req, 70_000)
    const parsed = TestClassifierSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 })
    }

    const allowlist = senderAllowed(parsed.data.email_from)
    const payload: WebhookEmailPayload = {
      ...parsed.data,
      email_id: `TEST-CLASSIFIER-${Date.now()}`,
    }

    const classified = await classifyEmail(payload)
    const agent = categoryToAgent(classified.category)

    return NextResponse.json({
      ok: true,
      sender_allowed: allowlist.allowed,
      configured_domains: allowlist.configured_domains,
      category: classified.category,
      confidence: classified.confidence,
      extracted_data: classified.extracted_data,
      agent,
      would_trigger_agent: allowlist.allowed && classified.category !== 'UNKNOWN' && agent !== null,
      note: classified.category === 'UNKNOWN'
        ? 'Si correos claros vuelven como UNKNOWN, revisa ANTHROPIC_API_KEY y que el cuerpo/adjunto tenga texto legible.'
        : null,
    })
  } catch (err) {
    return safeError(err, 'classifier-test', 500, 'No se pudo clasificar el correo de prueba')
  }
})
