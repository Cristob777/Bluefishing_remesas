import { NextRequest, NextResponse } from 'next/server'

// Origins are configured via ALLOWED_ORIGINS env var (comma-separated).
// Example: https://myapp.vercel.app,https://myapp-preview.vercel.app
const envOrigins = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

const ALLOWED_ORIGINS = new Set([
  ...envOrigins,
  ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : []),
])

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

// ── Security headers ──────────────────────────────────────────────────────────

function buildSecurityHeaders(nonce: string) {
  const devScriptPolicy = process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''

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
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline'${devScriptPolicy}`,
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

function tryExtractTokenFromValue(value: string): string | null {
  try {
    const decoded = decodeURIComponent(value)

    // Format A: base64-encoded JSON session (newer @supabase/ssr)
    //   value starts with "base64-" prefix, rest is base64(JSON)
    if (decoded.startsWith('base64-')) {
      const b64 = decoded.slice('base64-'.length)
      const json = Buffer.from(b64, 'base64').toString('utf-8')
      const parsed = JSON.parse(json)
      const session = Array.isArray(parsed) ? parsed[0] : parsed
      return session?.access_token ?? null
    }

    // Format B: JSON object/array with access_token (classic SSR)
    if (decoded.startsWith('{') || decoded.startsWith('[')) {
      const parsed = JSON.parse(decoded)
      const session = Array.isArray(parsed) ? parsed[0] : parsed
      return session?.access_token ?? null
    }

    // Format C: raw JWT (eyJ...)
    if (decoded.startsWith('eyJ')) return decoded

    return null
  } catch {
    return null
  }
}

function isAuthenticated(req: NextRequest): boolean {
  const cookieHeader = req.headers.get('cookie') ?? ''
  if (!cookieHeader) return false

  // Collect all sb-* auth cookies — @supabase/ssr can chunk large tokens
  // into sb-<ref>-auth-token.0, sb-<ref>-auth-token.1, ... and each piece
  // is part of a single payload.
  const authCookies = new Map<string, string>()  // base name → concatenated chunks
  const chunks      = new Map<string, Map<number, string>>()

  for (const raw of cookieHeader.split(';')) {
    const cookie = raw.trim()
    const eqIdx  = cookie.indexOf('=')
    if (eqIdx === -1) continue
    const name  = cookie.slice(0, eqIdx).trim()
    const value = cookie.slice(eqIdx + 1).trim()
    if (!value) continue

    // Only Supabase auth cookies
    if (!/^sb-.+(auth-token|access-token)/.test(name)) continue

    // Chunked: name.0, name.1, ...
    const chunkMatch = name.match(/^(.+)\.(\d+)$/)
    if (chunkMatch) {
      const base = chunkMatch[1]
      const idx  = Number(chunkMatch[2])
      if (!chunks.has(base)) chunks.set(base, new Map())
      chunks.get(base)!.set(idx, value)
    } else {
      authCookies.set(name, value)
    }
  }

  // Stitch chunked cookies in order
  for (const [base, parts] of chunks) {
    const ordered = [...parts.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v)
    authCookies.set(base, ordered.join(''))
  }

  // Try to extract a valid, non-expired token from any of them
  for (const value of authCookies.values()) {
    const token = tryExtractTokenFromValue(value)
    if (token && jwtNotExpired(token)) return true
  }

  return false
}

// ── Main proxy ────────────────────────────────────────────────────────────────

export function proxy(req: NextRequest) {
  const nonce     = Buffer.from(crypto.randomUUID()).toString('base64')
  const requestId = crypto.randomUUID()

  // ── 1. Auth guard — /dashboard routes ────────────────────────────────────
  // DEMO_MODE skips auth so the demo deployment works without a Supabase session.
  if (req.nextUrl.pathname.startsWith('/dashboard') && process.env.DEMO_MODE !== 'true') {
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
