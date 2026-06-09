'use client'

import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Logo } from '@/components/ui/Logo'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [sent, setSent]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)
  const [error, setError]       = useState('')

  async function handleGuestLogin() {
    setGuestLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/auth/demo', { method: 'POST' })
      const json = await res.json() as { link?: string; error?: string }
      if (!res.ok || !json.link) {
        setError('No se pudo iniciar la sesión de demo. Intenta de nuevo.')
        return
      }
      window.location.href = json.link
    } finally {
      setGuestLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createBrowserClient()
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/dashboard/overview')}`

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      })

      if (otpError) {
        setError('No se pudo enviar el enlace. Verifica el correo e intenta de nuevo.')
      } else {
        setSent(true)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--bg-subtle)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border p-8"
        style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-md)' }}
      >
        {/* Logo */}
        <div className="mb-7 text-center">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--accent)' }}
          >
            <Logo size={24} />
          </div>
          <h1 className="text-lg font-semibold m-0" style={{ color: 'var(--fg-1)' }}>
            Agentes de Importación
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--fg-3)' }}>
            Bluefishing CL
          </p>
        </div>

        {sent ? (
          /* ── Sent state ── */
          <div className="text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--success-bg)' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--fg-1)' }}>
              Enlace enviado
            </p>
            <p className="text-[13px]" style={{ color: 'var(--fg-3)' }}>
              Revisa tu correo en <strong style={{ color: 'var(--fg-2)' }}>{email}</strong> y haz clic en el enlace para entrar.
            </p>
            <p className="text-xs mt-4" style={{ color: 'var(--fg-4)' }}>
              El enlace expira en 1 hora.
            </p>
            <button
              onClick={() => { setSent(false); setEmail('') }}
              className="mt-4 text-xs"
              style={{ color: 'var(--fg-link)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Usar otro correo
            </button>
          </div>
        ) : (
          /* ── Form state ── */
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: 'var(--fg-2)' }}
              >
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
                placeholder="tu@email.com"
                className="input"
              />
            </div>

            {error && (
              <p className="text-[13px] m-0" style={{ color: 'var(--danger)' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn--primary w-full justify-center mt-1"
              style={{ opacity: loading ? 0.75 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Enviando…' : 'Enviar enlace de acceso'}
            </button>

            {/* ── Guest / demo path ── */}
            <div className="flex items-center gap-2 my-0.5">
              <hr className="flex-1" style={{ borderColor: 'var(--border)' }} />
              <span className="text-[11px]" style={{ color: 'var(--fg-4)' }}>o</span>
              <hr className="flex-1" style={{ borderColor: 'var(--border)' }} />
            </div>

            <button
              type="button"
              onClick={handleGuestLogin}
              disabled={guestLoading || loading}
              className="btn w-full justify-center"
              style={{
                opacity: (guestLoading || loading) ? 0.65 : 1,
                cursor: (guestLoading || loading) ? 'not-allowed' : 'pointer',
              }}
            >
              {guestLoading ? 'Cargando…' : 'Ver demo →'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
