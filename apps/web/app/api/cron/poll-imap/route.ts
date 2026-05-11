import { NextRequest, NextResponse } from 'next/server'
import { pollAllGmailAccounts } from '@/lib/services/gmail-extractor'

export const maxDuration = 60

export async function GET(req: NextRequest) {
  // Protect against unauthorized calls (Vercel Cron sends this header)
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()

  try {
    const result = await pollAllGmailAccounts()
    const duration = Date.now() - start

    return NextResponse.json({
      ok:        true,
      processed: result.processed,
      errors:    result.errors,
      duration_ms: duration,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
