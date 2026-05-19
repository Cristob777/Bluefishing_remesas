import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function signIn(formData: FormData) {
  'use server'

  const email    = formData.get('email')    as string
  const password = formData.get('password') as string
  const next     = (formData.get('next') as string) ?? '/dashboard/overview'

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
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

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FAFAF9',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '1rem',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '360px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E7E5E4',
        borderRadius: '16px',
        padding: '2rem',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}>
        <div style={{ marginBottom: '1.75rem', textAlign: 'center' }}>
          <div style={{
            width: 44, height: 44, borderRadius: '12px',
            background: '#4F46E5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem', fontSize: 22,
          }}>🎣</div>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0A0A0A', margin: 0 }}>
            Import Workflow Agents
          </h1>
          <p style={{ fontSize: '0.8125rem', color: '#A3A3A3', marginTop: '0.25rem' }}>
            Sign in to your account
          </p>
        </div>

        <form action={signIn} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <input type="hidden" name="next" value={next} />

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#525252', marginBottom: '0.375rem' }}>
              Email
            </label>
            <input type="email" name="email" required autoComplete="email"
              placeholder="your@email.com"
              style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.875rem',
                backgroundColor: '#FAFAF9', border: '1px solid #E7E5E4', borderRadius: '8px',
                color: '#0A0A0A', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#525252', marginBottom: '0.375rem' }}>
              Password
            </label>
            <input type="password" name="password" required autoComplete="current-password"
              placeholder="••••••••"
              style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.875rem',
                backgroundColor: '#FAFAF9', border: '1px solid #E7E5E4', borderRadius: '8px',
                color: '#0A0A0A', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {hasErr && (
            <p style={{ fontSize: '0.8125rem', color: '#DC2626', margin: 0 }}>
              Invalid email or password
            </p>
          )}

          <button type="submit" style={{
            marginTop: '0.25rem', width: '100%', padding: '0.625rem',
            background: '#4F46E5', color: '#FFFFFF', border: 'none',
            borderRadius: '8px', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer',
          }}>
            Sign in
          </button>
        </form>
      </div>
    </div>
  )
}
