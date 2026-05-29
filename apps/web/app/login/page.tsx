import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Logo } from '@/components/ui/Logo'
import { LoginButton } from '@/components/ui/LoginButton'

async function sendMagicLink(formData: FormData) {
  'use server'

  const email   = formData.get('email') as string
  const next    = (formData.get('next') as string) ?? '/dashboard/overview'

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ''

  if (!supabaseUrl || !supabaseKey) {
    redirect(`/login?error=config&next=${encodeURIComponent(next)}`)
  }

  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const proto = host.startsWith('localhost') ? 'http' : 'https'
  const siteUrl = `${proto}://${host}`

  const cookieStore = await cookies()
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll:  () => cookieStore.getAll(),
      setAll: (cs) => cs.forEach(({ name, value, options }) =>
        cookieStore.set(name, value, options)
      ),
    },
  })

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  })

  if (error) {
    redirect(`/login?error=invalid&next=${encodeURIComponent(next)}`)
  }

  redirect(`/login?sent=1&email=${encodeURIComponent(email)}`)
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; sent?: string; email?: string }>
}) {
  const params  = await searchParams
  const next    = params.next ?? '/dashboard/overview'
  const sent    = params.sent === '1'
  const sentTo  = params.email ?? ''
  const hasErr  = params.error === 'invalid' || params.error === 'callback'
  const hasConfigErr = params.error === 'config'

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
              Revisa tu correo{sentTo ? <> en <strong style={{ color: 'var(--fg-2)' }}>{sentTo}</strong></> : ''} y haz clic en el enlace para entrar.
            </p>
            <p className="text-xs mt-4" style={{ color: 'var(--fg-4)' }}>
              El enlace expira en 1 hora.
            </p>
          </div>
        ) : (
          /* ── Form state ── */
          <form action={sendMagicLink} className="flex flex-col gap-3.5">
            <input type="hidden" name="next" value={next} />

            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: 'var(--fg-2)' }}
              >
                Correo electrónico
              </label>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                autoFocus
                placeholder="tu@email.com"
                className="input"
              />
            </div>

            {hasErr && (
              <p className="text-[13px] m-0" style={{ color: 'var(--danger)' }}>
                {params.error === 'callback'
                  ? 'El enlace expiró o ya fue usado. Solicita uno nuevo.'
                  : 'Correo no reconocido o sin acceso.'}
              </p>
            )}

            {hasConfigErr && (
              <p className="text-[13px] m-0" style={{ color: 'var(--danger)' }}>
                Faltan variables de Supabase en el entorno.
              </p>
            )}

            <LoginButton label="Enviar enlace de acceso" />
          </form>
        )}
      </div>
    </div>
  )
}
