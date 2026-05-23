import { createServerClient } from '@/lib/supabase'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { OnboardingHero } from '@/components/ui/OnboardingHero'
import { GmailErrorBanner } from '@/components/ui/GmailErrorBanner'
import { Bot } from 'lucide-react'

function fmtMonto(n: number, moneda: string) {
  if (moneda === 'JPY') return `¥${n.toLocaleString('ja-JP')}`
  if (moneda === 'CLP') return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
  return `${moneda} ${n.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const min  = Math.floor(diff / 60000)
  if (min < 1)  return 'ahora'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24)   return `hace ${h} h`
  return `hace ${Math.floor(h / 24)} d`
}

const AGENT_META: Record<string, { label: string; color: string; bg: string }> = {
  invoice_intake:     { label: 'Factura',  color: '#4F46E5', bg: '#EEF2FF' },
  customs_funds:      { label: 'Aduana',   color: '#D97706', bg: '#FFFBEB' },
  din_reconciliation: { label: 'DIN',      color: '#7C3AED', bg: '#F5F3FF' },
  landed_cost:        { label: 'Costo',    color: '#059669', bg: '#ECFDF5' },
  manual_action:      { label: 'Manual',   color: '#525252', bg: '#F5F5F4' },
  imap_poller:        { label: 'Gmail',    color: '#525252', bg: '#F5F5F4' },
}

const ALERTA_ICON: Record<string, string> = {
  PROVISION_URGENTE:    '⚡',
  PAGO_PENDIENTE:       '💳',
  DIFERENCIA_STOCK:     '📦',
  APROBACION_REQUERIDA: '🔒',
  SALDO_FAVOR_AGENSA:   '🧾',
}

const ESTADO_COLOR: Record<string, { color: string; bg: string }> = {
  INVOICE_RECIBIDO:    { color: '#525252', bg: '#F5F5F4' },
  PAGO_PENDIENTE:      { color: '#D97706', bg: '#FFFBEB' },
  PAGO_PARCIAL:        { color: '#B45309', bg: '#FEF3C7' },
  PAGO_COMPLETO:       { color: '#059669', bg: '#ECFDF5' },
  EN_ADUANA:           { color: '#7C3AED', bg: '#F5F3FF' },
  PROVISION_RECIBIDA:  { color: '#2563EB', bg: '#EFF6FF' },
  MERCADERIA_RECIBIDA: { color: '#0891B2', bg: '#ECFEFF' },
  RECONCILIADO:        { color: '#059669', bg: '#ECFDF5' },
  SALDO_FAVOR:         { color: '#B45309', bg: '#FEF3C7' },
}

const ESTADO_LABELS: Record<string, string> = {
  INVOICE_RECIBIDO:    'Factura',
  PAGO_PENDIENTE:      'Por pagar',
  PAGO_PARCIAL:        'Parcial',
  PAGO_COMPLETO:       'Pagado',
  EN_ADUANA:           'Aduana',
  PROVISION_RECIBIDA:  'Provisión',
  MERCADERIA_RECIBIDA: 'Recibida',
  RECONCILIADO:        'Reconciliado',
  SALDO_FAVOR:         'Saldo',
}

interface AgentLogRow {
  id: string
  agent_name: string
  accion: string
  resultado: string | null
  created_at: string
}

function dedupeLogs(logs: AgentLogRow[]) {
  const out: Array<AgentLogRow & { count: number; first_at: string; last_at: string }> = []
  for (const log of logs) {
    const last = out[out.length - 1]
    if (last && last.agent_name === log.agent_name && last.accion === log.accion && last.resultado === log.resultado) {
      last.count++
      last.first_at = log.created_at
    } else {
      out.push({ ...log, count: 1, first_at: log.created_at, last_at: log.created_at })
    }
  }
  return out
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export default async function OverviewPage() {
  const supabase = createServerClient()
  if (!supabase) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <EmptyState
          icon={<span style={{ fontSize: 22 }}>⚙️</span>}
          title="Configuración pendiente"
          description="Las variables de entorno de Supabase aún no están configuradas para este despliegue."
        />
      </div>
    )
  }

  const [
    r1, r2, r3, r4,
    rProv,
    rPagos,
    rRemesasAll,
    { data: alertas },
    { data: agentLogs },
    { data: usdExposure },
    { data: jpyExposure },
    { data: recentRemesas },
  ] = await Promise.all([
    supabase.from('remesas').select('*', { count: 'exact', head: true }).not('estado', 'eq', 'RECONCILIADO'),
    supabase.from('pagos').select('*', { count: 'exact', head: true }).eq('estado', 'PENDIENTE'),
    supabase.from('provisiones_fondos').select('*', { count: 'exact', head: true }).eq('estado', 'PENDIENTE').lte('fecha_vencimiento', new Date(Date.now() + 3 * 86400000).toISOString()),
    supabase.from('stock_items').select('*', { count: 'exact', head: true }).not('diferencia', 'eq', 0),
    supabase.from('proveedores').select('*', { count: 'exact', head: true }),
    supabase.from('pagos').select('*', { count: 'exact', head: true }).eq('estado', 'CONFIRMADO'),
    supabase.from('remesas').select('*', { count: 'exact', head: true }),
    supabase.from('alertas').select('*').eq('leida', false).order('created_at', { ascending: false }).limit(8),
    supabase.from('agent_logs').select('*').order('created_at', { ascending: false }).limit(20),
    supabase.from('remesas').select('monto_original').eq('moneda_origen', 'USD').not('estado', 'eq', 'RECONCILIADO'),
    supabase.from('remesas').select('monto_original').eq('moneda_origen', 'JPY').not('estado', 'eq', 'RECONCILIADO'),
    supabase.from('remesas')
      .select('id, numero_invoice, monto_original, moneda_origen, estado, created_at, proveedor:proveedores(nombre)')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const stats = {
    remesasActivas:      r1.count ?? 0,
    pagosPendientes:     r2.count ?? 0,
    provisionesUrgentes: r3.count ?? 0,
    diferenciasStock:    r4.count ?? 0,
  }

  const proveedoresCount = rProv.count ?? 0
  const remesasTotal     = rRemesasAll.count ?? 0
  const pagosConfirmados = rPagos.count ?? 0
  const isFirstRun       = proveedoresCount === 0 && remesasTotal === 0

  const recentLogs   = (agentLogs ?? []) as AgentLogRow[]
  const lastImapLog  = recentLogs.find(l => l.agent_name === 'imap_poller')
  const gmailBroken  = lastImapLog?.resultado === 'ERROR'
  const lastErrorAt  = gmailBroken ? lastImapLog!.created_at : undefined

  if (isFirstRun) {
    const onboardingSteps = [
      {
        id: 'gmail',
        label: 'Conectar Gmail de operaciones',
        done: !gmailBroken && (pagosConfirmados + remesasTotal) > 0,
        href: '/api/gmail-auth',
      },
      {
        id: 'suppliers',
        label: 'Agregar tu primer proveedor',
        done: proveedoresCount > 0,
        hint: 'Se crea automáticamente al recibir la primera factura',
      },
      {
        id: 'invoice',
        label: 'Recibir tu primera factura',
        done: remesasTotal > 0,
        hint: 'Reenvía un correo de proveedor al buzón conectado',
      },
      {
        id: 'pago',
        label: 'Confirmar tu primer pago',
        done: pagosConfirmados > 0,
        hint: 'Disponible cuando llegue la primera factura',
      },
    ]

    return (
      <div className="min-h-screen">
        {gmailBroken && <GmailErrorBanner lastErrorAt={lastErrorAt} />}
        <OnboardingHero
          steps={onboardingSteps}
          companyName={process.env.NEXT_PUBLIC_COMPANY_DISPLAY ?? 'tu empresa'}
        />
      </div>
    )
  }

  const totalUSD = (usdExposure ?? []).reduce((s: number, r: { monto_original: number }) => s + (r.monto_original || 0), 0)
  const totalJPY = (jpyExposure ?? []).reduce((s: number, r: { monto_original: number }) => s + (r.monto_original || 0), 0)
  const showFxRow = totalUSD > 0 || totalJPY > 0

  const today = new Date().toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const ownerName = (process.env.NEXT_PUBLIC_OWNER_DISPLAY ?? 'Admin').split(' ')[0]

  const STAT_CARDS = [
    { label: 'Remesas activas',      value: stats.remesasActivas,      sub: 'en curso',           accent: '#4F46E5' },
    { label: 'Pagos pendientes',     value: stats.pagosPendientes,     sub: 'por emitir',         accent: '#D97706' },
    { label: 'Provisiones urgentes', value: stats.provisionesUrgentes, sub: 'vencen en ≤ 3 días', accent: stats.provisionesUrgentes > 0 ? '#DC2626' : '#059669' },
    { label: 'Diferencias stock',    value: stats.diferenciasStock,    sub: 'SKUs sin resolver',  accent: stats.diferenciasStock > 0 ? '#D97706' : '#059669' },
  ]

  const dedupedLogs = dedupeLogs(recentLogs).slice(0, 8)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>

      {gmailBroken && <GmailErrorBanner lastErrorAt={lastErrorAt} />}

      {/* ── Clean header ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b px-8 pt-8 pb-6" style={{ borderColor: '#E7E5E4' }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-1" style={{ color: '#A3A3A3' }}>
              Panel de control
            </p>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#0A0A0A' }}>
              {greeting()}, {ownerName}
            </h1>
            <p className="text-sm mt-1 capitalize" style={{ color: '#A3A3A3' }}>{today}</p>
          </div>
          <div className="flex flex-col items-end gap-2 mt-1">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: '#059669', display: 'inline-block' }} />
              <span className="text-xs font-semibold" style={{ color: '#059669' }}>4 agentes activos</span>
            </div>
            <p className="text-[11px]" style={{ color: '#A3A3A3' }}>{process.env.NEXT_PUBLIC_COMPANY_DISPLAY ?? 'Operaciones de Importación'}</p>
          </div>
        </div>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      <div className="px-8 pt-6">
        <div className="grid grid-cols-4 gap-4">
          {STAT_CARDS.map(s => (
            <div
              key={s.label}
              className="bg-white rounded-xl p-5 border"
              style={{ borderColor: '#E7E5E4', borderLeft: `3px solid ${s.accent}`, boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: '#A3A3A3' }}>{s.sub}</p>
              <p className="text-[38px] font-extrabold leading-none mono" style={{ color: s.accent }}>{s.value}</p>
              <p className="text-xs mt-2 font-semibold" style={{ color: '#525252' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── FX exposure row ──────────────────────────────────────────────── */}
      {showFxRow && (
        <div className="px-8 mt-4 grid grid-cols-2 gap-4">
          {[
            { flag: '🇺🇸', label: 'Exposición USD', value: `$${totalUSD.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, currency: 'USD', iconBg: '#FEF3C7', accent: '#D97706', show: totalUSD > 0 },
            { flag: '🇯🇵', label: 'Exposición JPY', value: `¥${totalJPY.toLocaleString('ja-JP')}`, currency: 'JPY', iconBg: '#EEF2FF', accent: '#4F46E5', show: totalJPY > 0 },
          ].filter(fx => fx.show).map(fx => (
            <div key={fx.currency} className="bg-white rounded-xl border p-4 flex items-center gap-4" style={{ borderColor: '#E7E5E4' }}>
              <div className="flex items-center justify-center w-10 h-10 rounded-xl text-xl flex-shrink-0" style={{ background: fx.iconBg }}>
                {fx.flag}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#A3A3A3' }}>{fx.label}</p>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-xl font-extrabold mono leading-none" style={{ color: '#0A0A0A' }}>{fx.value}</p>
                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: fx.iconBg, color: fx.accent }}>{fx.currency}</span>
                </div>
                <p className="text-[10px] mt-1" style={{ color: '#A3A3A3' }}>en remesas activas</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Main grid ────────────────────────────────────────────────────── */}
      <div className="px-8 mt-5 pb-8 grid grid-cols-5 gap-5">

        {/* Left: recent remesas mini-table */}
        <div className="col-span-3 bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#E7E5E4' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#E7E5E4' }}>
            <h2 className="text-sm font-bold" style={{ color: '#0A0A0A' }}>Remesas recientes</h2>
            <a href="/dashboard/remesas" className="text-[11px] font-semibold" style={{ color: '#4F46E5' }}>
              Ver todas →
            </a>
          </div>

          {!recentRemesas?.length ? (
            <EmptyState
              icon={<span style={{ fontSize: 22 }}>📦</span>}
              title="Sin remesas"
              description="Las remesas aparecerán aquí cuando llegue la primera factura."
            />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#FAFAF9', borderBottom: '1px solid #E7E5E4' }}>
                  {['Nº Invoice', 'Proveedor', 'Monto', 'Estado', 'Fecha'].map(h => (
                    <th key={h} className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: '#A3A3A3' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {((recentRemesas ?? []) as unknown as Array<{
                  id: string
                  numero_invoice: string
                  monto_original: number
                  moneda_origen: string
                  estado: string
                  created_at: string
                  proveedor: Array<{ nombre: string }> | { nombre: string } | null
                }>).map((r, i) => {
                  const ec = ESTADO_COLOR[r.estado] ?? { color: '#525252', bg: '#F5F5F4' }
                  const provNombre = Array.isArray(r.proveedor)
                    ? r.proveedor[0]?.nombre
                    : r.proveedor?.nombre
                  return (
                    <tr
                      key={r.id}
                      className="transition-colors hover:bg-stone-50"
                      style={{ borderBottom: i < (recentRemesas?.length ?? 0) - 1 ? '1px solid #F5F5F4' : 'none' }}
                    >
                      <td className="px-5 py-3 text-[12px] font-semibold mono" style={{ color: '#0A0A0A' }}>
                        {r.numero_invoice}
                      </td>
                      <td className="px-5 py-3 text-[12px]" style={{ color: '#525252' }}>
                        {provNombre ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-[12px] font-semibold mono" style={{ color: '#0A0A0A' }}>
                        {fmtMonto(r.monto_original, r.moneda_origen)}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: ec.bg, color: ec.color }}
                        >
                          {ESTADO_LABELS[r.estado] ?? r.estado}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[11px] mono" style={{ color: '#A3A3A3' }}>
                        {relTime(r.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Right: agent activity */}
        <div className="col-span-2 bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#E7E5E4' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#E7E5E4' }}>
            <h2 className="text-sm font-bold" style={{ color: '#0A0A0A' }}>Actividad de agentes</h2>
            <span className="text-[11px]" style={{ color: '#A3A3A3' }}>Últimas acciones</span>
          </div>

          {!dedupedLogs.length ? (
            <EmptyState
              icon={<Bot size={20} style={{ color: '#A3A3A3' }} />}
              title="Agentes en espera"
              description="Se activarán cuando llegue el primer correo."
            />
          ) : (
            <div>
              {dedupedLogs.map((l, i) => {
                const meta   = AGENT_META[l.agent_name] ?? { label: l.agent_name, color: '#525252', bg: '#F5F5F4' }
                const isDone = l.resultado === 'SUCCESS'
                const isErr  = l.resultado === 'ERROR'
                const showCount = l.count > 1
                return (
                  <div
                    key={l.id}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-stone-50"
                    style={{ borderBottom: i < dedupedLogs.length - 1 ? '1px solid #F5F5F4' : 'none' }}
                  >
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: meta.bg, color: meta.color }}>
                      {meta.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: '#0A0A0A' }}>
                        {l.accion.replace(/_/g, ' ').toLowerCase()}
                        {showCount && <span className="ml-1.5 font-mono" style={{ color: '#A3A3A3' }}>×{l.count}</span>}
                      </p>
                      <p className="text-[10px] mono" style={{ color: '#A3A3A3' }}>{relTime(l.last_at)}</p>
                    </div>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                      style={
                        isDone ? { background: '#ECFDF5', color: '#059669' }
                        : isErr ? { background: '#FEF2F2', color: '#DC2626' }
                        : { background: '#FFFBEB', color: '#D97706' }
                      }
                    >
                      {l.resultado ?? '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Alertas full width ───────────────────────────────────────────── */}
      <div className="px-8 pb-8">
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#E7E5E4' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#E7E5E4' }}>
            <h2 className="text-sm font-bold" style={{ color: '#0A0A0A' }}>Alertas activas</h2>
            {alertas && alertas.length > 0 && (
              <Badge variant="urgent">{alertas.length} pendientes</Badge>
            )}
          </div>

          {!alertas?.length ? (
            <EmptyState
              icon={<span style={{ fontSize: 22 }}>🔔</span>}
              title="Sin alertas activas"
              description="Todo en orden. Las alertas aparecen aquí cuando los agentes detectan situaciones que requieren atención."
            />
          ) : (
            <ul>
              {(alertas as Array<{
                id: string; tipo: string; mensaje: string
                urgente: boolean; destinatario: string; created_at: string
              }>).map((a, i) => (
                <li
                  key={a.id}
                  className="flex gap-3 px-5 py-3.5 transition-colors hover:bg-stone-50"
                  style={{
                    borderBottom: i < alertas.length - 1 ? '1px solid #F5F5F4' : 'none',
                    borderLeft: a.urgente ? '2px solid #DC2626' : '2px solid transparent',
                  }}
                >
                  <span className="text-lg mt-0.5 flex-shrink-0">{ALERTA_ICON[a.tipo] ?? '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] leading-relaxed" style={{ color: '#374151' }}>{a.mensaje}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] mono" style={{ color: '#A3A3A3' }}>{relTime(a.created_at)}</span>
                      <span style={{ color: '#D6D3D1' }}>·</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ background: '#F5F5F4', color: '#737373' }}>
                        {a.destinatario}
                      </span>
                    </div>
                  </div>
                  {a.urgente && <Badge variant="urgent">Urgente</Badge>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
