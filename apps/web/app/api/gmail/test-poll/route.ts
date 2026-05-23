import { NextRequest, NextResponse } from 'next/server'
import { withRole, type AuthUser } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'
import { safeError } from '@/lib/errors'
import { pollAllGmailAccounts } from '@/lib/services/gmail-extractor'

export const maxDuration = 60

export const POST = withRole(['owner', 'finance'], async (req: NextRequest, user: AuthUser) => {
  const limited = rateLimit(req, 'action', user.id)
  if (limited) return limited

  const startedAt = Date.now()

  try {
    const result = await pollAllGmailAccounts()

    return NextResponse.json({
      ok:          result.errors.length === 0,
      processed:   result.processed,
      errors:      result.errors,
      duration_ms: Date.now() - startedAt,
    })
  } catch (err) {
    return safeError(err, 'gmail-test-poll', 500, 'No se pudo leer Gmail')
  }
})
