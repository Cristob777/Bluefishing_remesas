'use client'

import { useEffect } from 'react'

// Silently seeds demo data on first dashboard visit in demo deployments.
// Only fires on importops-* hosts — no-ops in production.
export function DemoAutoSeed() {
  useEffect(() => {
    if (!window.location.hostname.includes('importops')) return
    const key = 'demo_seeded_v1'
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    fetch('/api/demo/seed', { method: 'POST' }).catch(() => null)
  }, [])

  return null
}
