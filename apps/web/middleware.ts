import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ALLOWED_ORIGINS = new Set([
  'https://bluefishing-agents.vercel.app',
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
      `script-src 'self' 'nonce-${nonce}'`,
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

// ── Supabase session check from cookie ───────────────────────────────────────

async function isAuthenticated(req: NextRequest): Promise<boolean> {
  const cookies    = req.headers.get('cookie') ?? ''
  const tokenMatch = cookies.match(/sb-[^=]+=([^;]+)/)
  if (!tokenMatch) return false

  try {
    const raw    = decodeURIComponent(tokenMatch[1])
    const parsed = JSON.parse(raw)
    const token  = Array.isArray(parsed) ? parsed[0]?.access_token : parsed?.access_token
    if (!token) return false

    const { error } = await createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    ).auth.getUser(token)

    return !error
  } catch {
    return false
  }
}

// ── Main middleware ───────────────────────────────────────────────────────────

export async function middleware(req: NextRequest) {
  const { pathname, method } = req.nextUrl.pathname
    ? { pathname: req.nextUrl.pathname, method: req.method }
    : { pathname: '/', method: req.method }

  const nonce     = Buffer.from(crypto.randomUUID()).toString('base64')
  const requestId = crypto.randomUUID()

  // ── 1. Auth guard — /dashboard routes ────────────────────────────────────
  if (req.nextUrl.pathname.startsWith('/dashboard')) {
    const authed = await isAuthenticated(req)
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
