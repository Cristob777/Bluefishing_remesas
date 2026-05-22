import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const min  = Math.floor(diff / 60000)
  if (min < 1)  return 'just now'
  if (min < 60) return `${min}m ago`
  const h = Math.floor(min / 60)
  if (h < 24)   return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ gmail?: string; reason?: string }>
}) {
  const params = await searchParams
  const gmailStatus = params.gmail   // 'connected' | 'error'
  const errorReason = params.reason  // 'no_refresh_token' | 'token_exchange_failed' | etc.

  const { data: accounts } = await sb()
    .from('gmail_accounts')
    .select('id, account_label, email, connected_by, created_at, updated_at')
    .order('created_at', { ascending: true })

  const errorMessages: Record<string, string> = {
    no_refresh_token:       'No refresh token received. Revoke access at myaccount.google.com/permissions and try again.',
    token_exchange_failed:  'Failed to exchange authorization code. Please try again.',
    db_write_failed:        'Failed to save the token. Please try again.',
    invalid_state:          'Invalid or expired OAuth session. Please try again.',
    missing_params:         'Missing authorization parameters from Google. Please try again.',
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0A0A0A', margin: 0 }}>Settings</h1>
        <p style={{ fontSize: '0.8125rem', color: '#A3A3A3', marginTop: '0.25rem' }}>
          Manage connected Gmail accounts for email processing.
        </p>
      </div>

      {/* Status banners */}
      {gmailStatus === 'connected' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.625rem',
          padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1.5rem',
          background: '#ECFDF5', border: '1px solid #A7F3D0',
        }}>
          <span style={{ fontSize: '1rem' }}>✅</span>
          <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#065F46', margin: 0 }}>
            Gmail account connected successfully. Emails will be processed in the next polling cycle.
          </p>
        </div>
      )}
      {gmailStatus === 'error' && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '0.625rem',
          padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1.5rem',
          background: '#FEF2F2', border: '1px solid #FECACA',
        }}>
          <span style={{ fontSize: '1rem' }}>⚠️</span>
          <div>
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#991B1B', margin: 0 }}>
              Gmail connection failed
            </p>
            <p style={{ fontSize: '0.8125rem', color: '#B91C1C', margin: '0.25rem 0 0' }}>
              {errorReason ? (errorMessages[errorReason] ?? errorReason) : 'Please try again.'}
            </p>
          </div>
        </div>
      )}

      {/* Gmail accounts card */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E7E5E4', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #F5F5F4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1rem' }}>📬</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0A0A0A' }}>Gmail Accounts</span>
            {accounts && accounts.length > 0 && (
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, background: '#ECFDF5', color: '#065F46', padding: '0.125rem 0.5rem', borderRadius: '999px' }}>
                {accounts.length} connected
              </span>
            )}
          </div>
          <a
            href="/api/gmail-auth"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.4375rem 0.875rem', borderRadius: '8px',
              background: '#4F46E5', color: '#FFFFFF',
              fontSize: '0.8125rem', fontWeight: 500, textDecoration: 'none',
            }}
          >
            <span>+</span> Connect Gmail
          </a>
        </div>

        {!accounts || accounts.length === 0 ? (
          <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📭</div>
            <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#525252', margin: 0 }}>No Gmail accounts connected yet</p>
            <p style={{ fontSize: '0.8125rem', color: '#A3A3A3', marginTop: '0.25rem' }}>
              Click &ldquo;Connect Gmail&rdquo; to authorize your inbox for email processing.
            </p>
          </div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {accounts.map((acct, idx) => (
              <li key={acct.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.875rem',
                padding: '0.875rem 1.25rem',
                borderTop: idx > 0 ? '1px solid #F5F5F4' : 'none',
              }}>
                {/* Avatar */}
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.9375rem', flexShrink: 0,
                }}>
                  📧
                </div>
                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0A0A0A', margin: 0 }}>
                    {acct.email ?? acct.account_label}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#A3A3A3', margin: '0.125rem 0 0' }}>
                    Label: <span style={{ fontFamily: 'monospace', color: '#737373' }}>{acct.account_label}</span>
                    {' · '}Connected {relTime(acct.updated_at ?? acct.created_at)}
                  </p>
                </div>
                {/* Status badge */}
                <span style={{
                  fontSize: '0.6875rem', fontWeight: 600,
                  background: '#ECFDF5', color: '#065F46',
                  padding: '0.1875rem 0.5rem', borderRadius: '999px', flexShrink: 0,
                }}>
                  Active
                </span>
                {/* Reconnect */}
                <a
                  href={`/api/gmail-auth?account=${encodeURIComponent(acct.account_label)}`}
                  style={{
                    fontSize: '0.75rem', color: '#6B7280', textDecoration: 'none',
                    padding: '0.25rem 0.5rem', borderRadius: '6px',
                    border: '1px solid #E5E7EB', flexShrink: 0,
                  }}
                >
                  Reconnect
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Help note */}
      <p style={{ fontSize: '0.75rem', color: '#A3A3A3', marginTop: '1rem', lineHeight: 1.6 }}>
        Each person (Sebastian, Hector) can connect their own inbox, or use a shared ops inbox.
        Gmail filters can be set up at{' '}
        <a href="/api/setup/gmail-filters" style={{ color: '#4F46E5', textDecoration: 'none' }}>
          /api/setup/gmail-filters
        </a>{' '}
        to forward supplier and customs emails automatically.
      </p>
    </div>
  )
}
