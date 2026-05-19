import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_ORIGINS = new Set([
  'https://bluefishing-agents.vercel.app',
  'https://bluefishingremesasv01-otct8i4i1-cristob777s-projects.vercel.app',
  ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : []),
])

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

// ── Security headers ──────────────────────────────────────────────────────────

function buildSecurityHeaders(nonce: string) {
  return {
    'X-Content-Type-Options':    'nosniff',
    'X-Frame-Options':           'DENY',
    'X-XSS-Protection':          '0',
    'Referrer-Policy':           'strict-origin-when-cross-origin',
    'Permissions-Policy':        'camera=(), microphone=(), geolocation=(), payment=()',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-DNS-Prefetch-Control':    'off',
    'Content-Security-Policy': [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline'`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.cmfchile.cl",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join('; '),
  }
}

// ── Supabase session check — local JWT expiry only (no network call) ─────────
// Full token validation happens server-side in API routes via Supabase RLS.
// Here we just check the cookie exists and the access_token isn't expired.

function jwtNotExpired(token: string): boolean {
  try {
    const payloadB64 = token.split('.')[1]
    if (!payloadB64) return false
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString())
    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now()
  } catch {
    return false
  }
}

function isAuthenticated(req: NextRequest): boolean {
  const cookieHeader = req.headers.get('cookie') ?? ''

  // Find ALL cookies that look like Supabase auth cookies (any format/version)
  // @supabase/ssr uses: sb-<ref>-auth-token, sb-<ref>-auth-token.0, etc.
  const allCookies = cookieHeader.split(';').map(c => c.trim())

  for (const cookie of allCookies) {
    const eqIdx = cookie.indexOf('=')
    if (eqIdx === -1) continue
    const name  = cookie.slice(0, eqIdx).trim()
    const value = cookie.slice(eqIdx + 1).trim()

    // Match any Supabase auth cookie
    if (!/^sb-.+(auth-token|access-token)/.test(name)) continue

    try {
      const decoded = decodeURIComponent(value)

      // Format 1: JSON object with access_token
      if (decoded.startsWith('{') || decoded.startsWith('[')) {
        const parsed  = JSON.parse(decoded)
        const session = Array.isArray(parsed) ? parsed[0] : parsed
        const token   = session?.access_token
        if (token && jwtNotExpired(token)) return true
      }

      // Format 2: raw JWT (eyJ...)
      if (decoded.startsWith('eyJ') && jwtNotExpired(decoded)) return true

    } catch { /* continue to next cookie */ }
  }

  return false
}

// ── Main middleware ───────────────────────────────────────────────────────────

export function middleware(req: NextRequest) {
  const nonce     = Buffer.from(crypto.randomUUID()).toString('base64')
  const requestId = crypto.randomUUID()

  // ── 1. Auth guard — /dashboard routes ────────────────────────────────────
  if (req.nextUrl.pathname.startsWith('/dashboard')) {
    const authed = isAuthenticated(req)
    if (!authed) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('next', req.nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // ── 2. Cross-site mutation block (defense in depth for /api routes) ───────
  // Individual routes also enforce this via withAuth — this is a second layer.
  if (req.nextUrl.pathname.startsWith('/api/') && MUTATION_METHODS.has(req.method)) {
    const secFetch = req.headers.get('sec-fetch-site')
    const origin   = req.headers.get('origin')

    // Modern browsers always send Sec-Fetch-Site on cross-site requests
    if (secFetch === 'cross-site' && origin && !ALLOWED_ORIGINS.has(origin)) {
      return new NextResponse(null, { status: 403 })
    }
  }

  const res = NextResponse.next({
    request: {
      headers: new Headers({
        ...Object.fromEntries(req.headers),
        'x-nonce':      nonce,
        'x-request-id': requestId,
      }),
    },
  })

  // ── 3. Security headers ───────────────────────────────────────────────────
  for (const [key, value] of Object.entries(buildSecurityHeaders(nonce))) {
    res.headers.set(key, value)
  }
  res.headers.set('x-nonce',      nonce)
  res.headers.set('x-request-id', requestId)

  // ── 4. CORS — /api routes only ────────────────────────────────────────────
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const origin = req.headers.get('origin') ?? ''

    if (ALLOWED_ORIGINS.has(origin)) {
      res.headers.set('Access-Control-Allow-Origin', origin)
      res.headers.set('Vary', 'Origin')
    }

    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-webhook-secret')
    res.headers.set('Access-Control-Max-Age', '86400')

    if (req.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: res.headers })
    }
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
}
