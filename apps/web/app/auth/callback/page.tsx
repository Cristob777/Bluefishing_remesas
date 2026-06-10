'use client'

/**
 * Magic-link callback — runs entirely in the browser.
 *
 * Why client-side (not a Route Handler):
 *   When the callback was a server Route Handler, the Set-Cookie headers on the
 *   NextResponse.redirect() response were not reliably forwarded to the browser
 *   before the middleware ran on the following /dashboard request. Moving the
 *   exchange to the browser client means Supabase JS sets the session cookies
 *   directly — no timing gap.
 */

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'

function CallbackHandler() {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')

  useEffect(() => {
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/dashboard/overview'
    const supabase = createBrowserClient()

    const proceed = () => { router.push(next); router.refresh() }

    if (code) {
      // PKCE flow. For admin.generateLink links there is no stored verifier,
      // so exchangeCodeForSession may fail — fall back to getSession() in that case.
      supabase.auth.exchangeCodeForSession(code).then(async ({ error: err }) => {
        if (!err) { proceed(); return }
        const { data: { session } } = await supabase.auth.getSession()
        if (session) { proceed() } else {
          setError('El enlace expiró o ya fue usado. Solicita uno nuevo desde el login.')
        }
      })
    } else {
      // Implicit flow — tokens arrive in the URL hash (#access_token=...).
      // Use onAuthStateChange so we wait reliably for the client to parse the hash,
      // with a 4-second timeout fallback that polls getSession().
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          subscription.unsubscribe()
          clearTimeout(timer)
          proceed()
        }
      })
      const timer = setTimeout(async () => {
        subscription.unsubscribe()
        const { data: { session } } = await supabase.auth.getSession()
        if (session) { proceed() } else {
          setError('Enlace inválido o expirado. Solicita uno nuevo.')
        }
      }, 4000)
      return () => { subscription.unsubscribe(); clearTimeout(timer) }
    }
  }, [searchParams, router])

  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'var(--bg-subtle)' }}
      >
        <div className="text-center max-w-sm">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--danger-bg)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <p className="text-sm font-semibold mb-2" style={{ color: 'var(--fg-1)' }}>
            Error de autenticación
          </p>
          <p className="text-[13px] mb-5" style={{ color: 'var(--fg-3)' }}>{error}</p>
          <a href="/login" className="btn btn--primary">Volver al login</a>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--bg-subtle)' }}
    >
      <div className="text-center">
        <div
          className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
        />
        <p className="text-sm" style={{ color: 'var(--fg-3)' }}>Iniciando sesión…</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-subtle)' }}>
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  )
}
