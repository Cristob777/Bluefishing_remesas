import { NextRequest, NextResponse } from 'next/server'
import { pollAllAccounts } from '@/lib/services/imap-extractor'

// Vercel Cron: runs every 5 minutes (configure in vercel.json)
export const maxDuration = 60

export async function GET(req: NextRequest) {
  // Protect against unauthorized calls (Vercel Cron sends this header)
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()

  try {
    const result = await pollAllAccounts()
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
