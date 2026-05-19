// Rate limiter with a swappable backend interface.
// Current adapter: in-memory Map (acceptable for Vercel Hobby — resets on cold start).
// To swap to Redis/Upstash: implement RateLimiter and replace `adapter` below.

export interface RateLimiter {
  check(key: string): Promise<{ allowed: boolean; retryAfter?: number }>
}

const WINDOW_MS = 60_000
const MAX_REQS  = 20

// In-memory adapter
class InMemoryRateLimiter implements RateLimiter {
  private store = new Map<string, { count: number; resetAt: number }>()

  async check(key: string) {
    const now      = Date.now()
    const existing = this.store.get(key)

    if (!existing || now > existing.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + WINDOW_MS })
      return { allowed: true }
    }

    if (existing.count >= MAX_REQS) {
      return { allowed: false, retryAfter: Math.ceil((existing.resetAt - now) / 1000) }
    }

    existing.count++
    return { allowed: true }
  }
}

export const rateLimiter: RateLimiter = new InMemoryRateLimiter()

// Convenience sync wrapper — keeps callers simple for now
export function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now      = Date.now()
  const store    = (rateLimiter as InMemoryRateLimiter)['store'] as Map<string, { count: number; resetAt: number }>
  const existing = store.get(ip)

  if (!existing || now > existing.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true }
  }

  if (existing.count >= MAX_REQS) {
    return { allowed: false, retryAfter: Math.ceil((existing.resetAt - now) / 1000) }
  }

  existing.count++
  return { allowed: true }
}
