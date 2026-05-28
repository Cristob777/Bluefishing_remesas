import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { LoginButton } from '@/components/ui/LoginButton'
import { Logo } from '@/components/ui/Logo'

async function signIn(formData: FormData) {
  'use server'

  const email    = formData.get('email')    as string
  const password = formData.get('password') as string
  const next     = (formData.get('next') as string) ?? '/dashboard/overview'
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ''

  if (!supabaseUrl || !supabaseKey) {
    redirect(`/login?error=config&next=${encodeURIComponent(next)}`)
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll:  () => cookieStore.getAll(),
        setAll: (cs) => cs.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        ),
      },
    }
  )

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/login?error=invalid&next=${encodeURIComponent(next)}`)
  }

  redirect(next)
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const params = await searchParams
  const next   = params.next ?? '/dashboard/overview'
  const hasErr = params.error === 'invalid'
  const hasConfigErr = params.error === 'config'

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-sm bg-white border rounded-2xl p-8"
        style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

        {/* Logo + title */}
        <div className="mb-7 text-center">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mx-auto mb-4"
            style={{ background: 'var(--accent)' }}>
            <Logo size={24} />
          </div>
          <h1 className="text-lg font-semibold m-0" style={{ color: 'var(--text-primary)' }}>
            Agentes de Importación
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
            Inicia sesión en tu cuenta
          </p>
        </div>

        <form action={signIn} className="flex flex-col gap-3.5">
          <input type="hidden" name="next" value={next} />

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Correo electrónico
            </label>
            <input
              type="email" name="email" required autoComplete="email"
              placeholder="tu@email.com"
              className="input"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Contraseña
            </label>
            <input
              type="password" name="password" required autoComplete="current-password"
              placeholder="••••••••"
              className="input"
            />
          </div>

          {hasErr && (
            <p className="text-[13px] m-0" style={{ color: 'var(--danger)' }}>
              Correo o contraseña inválidos
            </p>
          )}

          {hasConfigErr && (
            <p className="text-[13px] m-0" style={{ color: 'var(--danger)' }}>
              Falta configurar Supabase en el entorno local. En Vercel usa las variables del proyecto.
            </p>
          )}

          <LoginButton />
        </form>
      </div>
    </div>
  )
}
