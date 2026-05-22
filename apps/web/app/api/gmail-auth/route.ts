import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getAuthUrl } from '@/lib/services/gmail-extractor'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// GET /api/gmail-auth?account=sebastian
// Requires active dashboard session (cookie auth).
// Redirects the browser to Google OAuth consent screen.
export async function GET(req: NextRequest) {
  // ── Auth: verify dashboard session via Supabase SSR cookie ────────────────
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
    {
      cookies: {
        getAll:  () => cookieStore.getAll(),
        setAll: (cs) => cs.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        ),
      },
    },
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.redirect(new URL('/login?next=/dashboard/settings', req.url))
  }

  // ── Account label: query param or email prefix ────────────────────────────
  const account = req.nextUrl.searchParams.get('account')
    ?? user.email?.split('@')[0]
    ?? 'ops'

  // ── CSRF nonce: store in DB, embed as OAuth state ──────────────────────────
  const nonce = crypto.randomUUID()
  await sb().from('oauth_nonces').insert({ nonce, user_id: user.id })

  // ── Redirect to Google consent screen ─────────────────────────────────────
  // State encodes both nonce and account label so callback can restore both.
  const state   = `${nonce}:${account}`
  const authUrl = getAuthUrl(state)

  return NextResponse.redirect(authUrl)
}
