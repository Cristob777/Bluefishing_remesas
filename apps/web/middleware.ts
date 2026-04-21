import { NextRequest, NextResponse } from 'next/server'

const SECURITY_HEADERS = {
  'X-Content-Type-Options':       'nosniff',
  'X-Frame-Options':              'DENY',
  'X-XSS-Protection':             '1; mode=block',
  'Referrer-Policy':              'strict-origin-when-cross-origin',
  'Permissions-Policy':           'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security':    'max-age=63072000; includeSubDomains; preload',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // Next.js requiere esto
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self' https://*.supabase.co https://api.cmfchile.cl",
    "frame-ancestors 'none'",
  ].join('; '),
}

export function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // Aplicar headers de seguridad a todas las respuestas
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(key, value)
  }

  // CORS — solo para rutas API
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const origin = req.headers.get('origin') ?? ''

    // En producción solo permitir el dominio propio
    // En desarrollo permitir localhost
    const allowedOrigins = [
      'https://bluefishing-agents.vercel.app',
      'http://localhost:3000',
    ]

    if (allowedOrigins.includes(origin)) {
      res.headers.set('Access-Control-Allow-Origin', origin)
    }

    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-webhook-secret')
    res.headers.set('Access-Control-Max-Age', '86400')

    // Responder preflight OPTIONS
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: res.headers })
    }
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
