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
  if (min < 1)  return 'ahora'
  if (min < 60) return `hace ${min}m`
  const h = Math.floor(min / 60)
  if (h < 24)   return `hace ${h}h`
  return `hace ${Math.floor(h / 24)}d`
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
    no_refresh_token:       'No se recibió refresh token. Revoca el acceso en myaccount.google.com/permissions e intenta de nuevo.',
    token_exchange_failed:  'Fallo al canjear el código de autorización. Intenta de nuevo.',
    db_write_failed:        'Error al guardar el token. Intenta de nuevo.',
    invalid_state:          'Sesión OAuth inválida o expirada. Intenta de nuevo.',
    missing_params:         'Parámetros de autorización faltantes desde Google. Intenta de nuevo.',
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">

      {/* Header */}
      <div className="mb-8">
        <p className="page-eyebrow">Sistema</p>
        <h1 className="page-title text-xl font-bold">Configuración</h1>
        <p className="page-subtitle">Administra las cuentas Gmail conectadas para el procesamiento de emails.</p>
      </div>

      {/* Status banners */}
      {gmailStatus === 'connected' && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-6 border"
          style={{ background: 'var(--success-bg)', borderColor: 'var(--success-border)' }}>
          <span className="text-base">✅</span>
          <p className="text-sm font-medium m-0" style={{ color: '#065F46' }}>
            Cuenta Gmail conectada exitosamente. Los emails se procesarán en el próximo ciclo.
          </p>
        </div>
      )}
      {gmailStatus === 'error' && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl mb-6 border"
          style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger-border)' }}>
          <span className="text-base">⚠️</span>
          <div>
            <p className="text-sm font-semibold m-0" style={{ color: '#991B1B' }}>
              Error al conectar Gmail
            </p>
            <p className="text-sm m-0 mt-1" style={{ color: '#B91C1C' }}>
              {errorReason ? (errorMessages[errorReason] ?? errorReason) : 'Intenta de nuevo.'}
            </p>
          </div>
        </div>
      )}

      {/* Gmail accounts card */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <span className="text-base">📬</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Cuentas Gmail</span>
            {accounts && accounts.length > 0 && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'var(--success-bg)', color: '#065F46' }}>
                {accounts.length} conectada{accounts.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <a
            href="/api/gmail-auth"
            className="btn-primary text-[13px] px-3.5 py-2"
          >
            + Conectar Gmail
          </a>
        </div>

        {!accounts || accounts.length === 0 ? (
          <div className="py-10 px-6 text-center">
            <div className="text-3xl mb-3">📭</div>
            <p className="text-sm font-medium m-0" style={{ color: 'var(--text-secondary)' }}>
              Sin cuentas Gmail conectadas
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
              Haz clic en &ldquo;Conectar Gmail&rdquo; para autorizar tu bandeja de entrada.
            </p>
          </div>
        ) : (
          <ul className="list-none m-0 p-0">
            {accounts.map((acct, idx) => (
              <li key={acct.id} className="flex items-center gap-3.5 px-5 py-3.5"
                style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}>
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-[15px] flex-shrink-0"
                  style={{ background: 'var(--accent-bg)' }}>
                  📧
                </div>
                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold m-0 truncate" style={{ color: 'var(--text-primary)' }}>
                    {acct.email ?? acct.account_label}
                  </p>
                  <p className="text-xs mt-0.5 m-0" style={{ color: 'var(--text-tertiary)' }}>
                    Label: <span className="mono" style={{ color: '#737373' }}>{acct.account_label}</span>
                    {' · '}Conectado {relTime(acct.updated_at ?? acct.created_at)}
                  </p>
                </div>
                {/* Status badge */}
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: 'var(--success-bg)', color: '#065F46' }}>
                  Activo
                </span>
                {/* Reconnect */}
                <a
                  href={`/api/gmail-auth?account=${encodeURIComponent(acct.account_label)}`}
                  className="btn-secondary text-xs px-2 py-1 flex-shrink-0"
                >
                  Reconectar
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Help note */}
      <p className="text-xs mt-4 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
        Cada persona (Sebastian, Hector) puede conectar su propia bandeja, o usar una bandeja de ops compartida.
        Los filtros de Gmail se pueden configurar en{' '}
        <a href="/api/setup/gmail-filters" className="hover:underline" style={{ color: 'var(--accent)' }}>
          /api/setup/gmail-filters
        </a>{' '}
        para reenviar automáticamente emails de proveedores y aduana.
      </p>
    </div>
  )
}
