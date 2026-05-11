import { NextRequest, NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/services/gmail-extractor'

// GET /api/gmail-auth?account=cristobal  — generates OAuth consent URL
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const account = req.nextUrl.searchParams.get('account') ?? 'cristobal'
  const url     = getAuthUrl(account)

  return NextResponse.json({ url })
}
