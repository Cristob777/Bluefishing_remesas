import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function makeOAuth2Client(baseUrl: string) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${baseUrl}/api/gmail-callback`,
  )
}

// GET /api/gmail-callback?code=...&state=<nonce>:<account>
// Google redirects here after the user approves OAuth consent.
export async function GET(req: NextRequest) {
  const code  = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state') ?? ''

  if (!code || !state) {
    return NextResponse.redirect(new URL('/dashboard/settings?gmail=error&reason=missing_params', req.url))
  }

  // ── State decoding: "<nonce>:<account_label>" ──────────────────────────────
  const colonIdx    = state.indexOf(':')
  const nonce       = colonIdx > 0 ? state.slice(0, colonIdx) : state
  const accountLabel = colonIdx > 0 ? state.slice(colonIdx + 1) : 'ops'

  // ── CSRF: verify nonce exists in DB ───────────────────────────────────────
  const supabase = sb()
  const { data: nonceRow } = await supabase
    .from('oauth_nonces')
    .select('user_id')
    .eq('nonce', nonce)
    .maybeSingle()

  if (!nonceRow) {
    return NextResponse.redirect(new URL('/dashboard/settings?gmail=error&reason=invalid_state', req.url))
  }

  // Consume nonce immediately (one-time use)
  await supabase.from('oauth_nonces').delete().eq('nonce', nonce)

  // ── Exchange code for tokens ───────────────────────────────────────────────
  const baseUrl = process.env.NEXTAUTH_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  const oauth2 = makeOAuth2Client(baseUrl)

  let refreshToken: string
  let email: string | null = null

  try {
    const { tokens } = await oauth2.getToken(code)
    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?gmail=error&reason=no_refresh_token', req.url)
      )
    }
    refreshToken = tokens.refresh_token

    // Best-effort: get the email address for display
    if (tokens.access_token) {
      try {
        oauth2.setCredentials(tokens)
        const oauth2api = google.oauth2({ version: 'v2', auth: oauth2 })
        const info = await oauth2api.userinfo.get()
        email = info.data.email ?? null
      } catch {
        // non-fatal — email is optional
      }
    }
  } catch {
    return NextResponse.redirect(
      new URL('/dashboard/settings?gmail=error&reason=token_exchange_failed', req.url)
    )
  }

  // ── Upsert into gmail_accounts ─────────────────────────────────────────────
  const { error: upsertError } = await supabase
    .from('gmail_accounts')
    .upsert(
      {
        account_label: accountLabel,
        email,
        refresh_token: refreshToken,
        connected_by:  nonceRow.user_id,
        updated_at:    new Date().toISOString(),
      },
      { onConflict: 'account_label' },
    )

  if (upsertError) {
    return NextResponse.redirect(
      new URL('/dashboard/settings?gmail=error&reason=db_write_failed', req.url)
    )
  }

  return NextResponse.redirect(
    new URL('/dashboard/settings?gmail=connected', req.url)
  )
}
