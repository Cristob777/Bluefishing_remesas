import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export type UserRole = 'owner' | 'finance' | 'warehouse' | 'agent'

export interface AuthUser {
  id:    string
  email: string
  role:  UserRole
}

function buildRoleMap(): Record<string, UserRole> {
  const map: Record<string, UserRole> = {}
  const owners  = (process.env.OWNER_EMAILS  ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  const finance = (process.env.FINANCE_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  for (const e of owners)  map[e] = 'owner'
  for (const e of finance) map[e] = 'finance'
  return map
}

const ROLE_MAP = buildRoleMap()

const ALLOWED_ORIGINS = new Set([
  ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : []),
  ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : []),
])

function resolveRoleFromEnv(email: string): UserRole {
  return ROLE_MAP[email.toLowerCase()] ?? 'warehouse'
}

function supabase() {
  // Accept both old name (ANON_KEY) and new Supabase name (PUBLISHABLE_KEY)
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey,
    { auth: { persistSession: false } },
  )
}

// Service-role client used only to read user_roles (bypasses RLS).
// Never expose this to the caller — it stays inside resolveRoleFromDb.
function supabaseService() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

// Primary RBAC source: user_roles table. Falls back to env var map if no row.
async function resolveRole(userId: string, email: string): Promise<UserRole> {
  try {
    const { data, error } = await supabaseService()
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle()

    if (!error && data?.role) {
      return data.role as UserRole
    }
  } catch (err) {
    console.error('[auth] user_roles lookup failed, falling back to env:', err)
  }
  return resolveRoleFromEnv(email)
}

async function verifyBearer(token: string): Promise<AuthUser | null> {
  const { data, error } = await supabase().auth.getUser(token)
  if (error || !data.user) return null
  const email = data.user.email ?? ''
  const role  = await resolveRole(data.user.id, email)
  return { id: data.user.id, email, role }
}

function tryExtractTokenFromValue(value: string): string | null {
  try {
    const decoded = decodeURIComponent(value)

    if (decoded.startsWith('base64-')) {
      const json = Buffer.from(decoded.slice('base64-'.length), 'base64').toString('utf-8')
      const parsed = JSON.parse(json)
      const session = Array.isArray(parsed) ? parsed[0] : parsed
      return session?.access_token ?? null
    }

    if (decoded.startsWith('{') || decoded.startsWith('[')) {
      const parsed = JSON.parse(decoded)
      const session = Array.isArray(parsed) ? parsed[0] : parsed
      return session?.access_token ?? null
    }

    if (decoded.startsWith('eyJ')) return decoded
    return null
  } catch {
    return null
  }
}

function collectSupabaseAuthCookieValues(cookieHeader: string): string[] {
  const authCookies = new Map<string, string>()
  const chunks      = new Map<string, Map<number, string>>()

  for (const raw of cookieHeader.split(';')) {
    const cookie = raw.trim()
    const eqIdx = cookie.indexOf('=')
    if (eqIdx === -1) continue

    const name = cookie.slice(0, eqIdx).trim()
    const value = cookie.slice(eqIdx + 1).trim()
    if (!value || !/^sb-.+(auth-token|access-token)/.test(name)) continue

    const chunkMatch = name.match(/^(.+)\.(\d+)$/)
    if (chunkMatch) {
      const base = chunkMatch[1]
      const idx = Number(chunkMatch[2])
      if (!chunks.has(base)) chunks.set(base, new Map())
      chunks.get(base)!.set(idx, value)
    } else {
      authCookies.set(name, value)
    }
  }

  for (const [base, parts] of chunks) {
    const ordered = [...parts.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, value]) => value)
    authCookies.set(base, ordered.join(''))
  }

  return [...authCookies.values()]
}

// Cookie auth for requests originating from the browser dashboard
async function verifyCookie(req: NextRequest): Promise<AuthUser | null> {
  const cookieHeader = req.headers.get('cookie') ?? ''
  if (!cookieHeader) return null

  for (const value of collectSupabaseAuthCookieValues(cookieHeader)) {
    const token = tryExtractTokenFromValue(value)
    if (!token) continue

    const user = await verifyBearer(token)
    if (user) return user
  }

  return null
}

// CSRF guard: mutations via cookie auth must originate from our domain.
// Requests with Authorization header are inherently CSRF-safe (browsers cannot
// set custom headers in cross-origin requests without a preflight).
function isCsrfSafe(req: NextRequest, usingBearer: boolean): boolean {
  if (usingBearer) return true
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true

  const origin = req.headers.get('origin')
  if (!origin) {
    // No Origin header — check Referer as fallback (same-host only)
    const referer = req.headers.get('referer')
    const host    = req.headers.get('host')
    if (referer && host) {
      try { return new URL(referer).host === host } catch { return false }
    }
    return true // server-to-server call without browser headers — allow
  }

  try {
    if (new URL(origin).host === req.nextUrl.host) return true
  } catch {
    return false
  }

  return ALLOWED_ORIGINS.has(origin)
}

// ── Body helpers ─────────────────────────────────────────────────────────────

export async function readJsonBody(req: NextRequest, maxBytes = 10_000): Promise<unknown> {
  const text = await req.text()
  if (text.length > maxBytes) {
    throw Object.assign(new Error('Payload too large'), { status: 413 })
  }
  return JSON.parse(text)
}

// ── Route wrappers ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteHandler<C = any> = (req: NextRequest, user: AuthUser, ctx: C) => Promise<NextResponse>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withAuth<C = any>(handler: RouteHandler<C>) {
  return async (req: NextRequest, ctx: C): Promise<NextResponse> => {
    const bearerHeader = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
    const usingBearer  = !!bearerHeader

    if (!isCsrfSafe(req, usingBearer)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const user = usingBearer
      ? await verifyBearer(bearerHeader!)
      : await verifyCookie(req)

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    return handler(req, user, ctx)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withRole<C = any>(allowedRoles: UserRole[], handler: RouteHandler<C>) {
  return withAuth<C>(async (req, user, ctx) => {
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    return handler(req, user, ctx)
  })
}
