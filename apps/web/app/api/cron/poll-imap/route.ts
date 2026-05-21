import { NextRequest, NextResponse } from 'next/server'
import { pollAllGmailAccounts } from '@/lib/services/gmail-extractor'
import { rateLimit } from '@/lib/rateLimit'
import { safeError } from '@/lib/errors'
import { timingSafeEqual } from 'crypto'

export const maxDuration = 60

function safeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return timingSafeEqual(aBuf, bBuf)
}

export async function GET(req: NextRequest) {
  // 1. Auth — Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
  const authHeader = req.headers.get('authorization') ?? ''
  const expected   = `Bearer ${process.env.CRON_SECRET ?? ''}`
  if (!process.env.CRON_SECRET || !safeCompare(authHeader, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Rate limit — defensive. Cron is supposed to fire once daily; reject bursts.
  //    Uses webhook preset (20/min) keyed to fixed cron id so concurrent invocations
  //    can't pile up.
  const limited = rateLimit(req, 'webhook', 'cron-poll-imap')
  if (limited) return limited

  const start = Date.now()

  try {
    const result   = await pollAllGmailAccounts()
    const duration = Date.now() - start

    return NextResponse.json({
      ok:          true,
      processed:   result.processed,
      errors:      result.errors,
      duration_ms: duration,
    })
  } catch (err) {
    return safeError(err, 'cron-poll-imap')
  }
}
