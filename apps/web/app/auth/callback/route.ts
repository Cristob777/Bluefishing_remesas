import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard/overview'

  console.log('[auth/callback] code:', code ? 'present' : 'MISSING', '| next:', next)

  if (!code) {
    console.log('[auth/callback] No code — full URL:', request.url)
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  const cookieStore = await cookies()
  const pendingCookies: Array<{ name: string; value: string; options: CookieOptions }> = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
    {
      cookies: {
        getAll:  () => cookieStore.getAll(),
        setAll: (cs) => {
          cs.forEach(({ name, value, options }) => pendingCookies.push({ name, value, options }))
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  console.log('[auth/callback] exchange result:', error ? `ERROR: ${error.message}` : 'OK', '| cookies set:', pendingCookies.length)

  if (!error) {
    const response = NextResponse.redirect(`${origin}${next}`)
    pendingCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
    return response
  }

  return NextResponse.redirect(`${origin}/login?error=exchange_failed&msg=${encodeURIComponent(error.message)}`)
}
