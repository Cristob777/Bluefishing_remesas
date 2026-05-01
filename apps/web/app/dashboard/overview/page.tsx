import { createServerClient } from '@/lib/supabase'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Bot } from 'lucide-react'

function fmtCLP(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
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

const AGENT_META: Record<string, { label: string; color: string; bg: string }> = {
  invoice_intake:     { label: 'Invoice',   color: '#4F46E5', bg: '#EEF2FF' },
  customs_funds:      { label: 'Aduanas',   color: '#D97706', bg: '#FFFBEB' },
  din_reconciliation: { label: 'DIN',       color: '#7C3AED', bg: '#F5F3FF' },
  landed_cost:        { label: 'L. Cost',   color: '#059669', bg: '#ECFDF5' },
  manual_action:      { label: 'Manual',    color: '#525252', bg: '#F5F5F4' },
}

const ALERTA_ICON: Record<string, string> = {
  PROVISION_URGENTE:    '⚡',
  PAGO_PENDIENTE:       '💳',
  DIFERENCIA_STOCK:     '📦',
  APROBACION_REQUERIDA: '🔒',
}

// Stars for the galactic hero — deterministic positions
const STARS = Array.from({ length: 40 }, (_, i) => ({
  x:    ((i * 73 + 17) % 100),
  y:    ((i * 41 + 29) % 100),
  size: i % 5 === 0 ? 2 : i % 3 === 0 ? 1.5 : 1,
  delay: (i * 0.15) % 3,
}))

export default async function OverviewPage() {
  const supabase = createServerClient()

  // Fetch all stats concurrently
  const [
    r1, r2, r3, r4,
    { data: alertas },
    { data: agentLogs },
    { data: usdExposure },
    { data: jpyExposure },
  ] = await Promise.all([
    supabase.from('remesas').select('*', { count: 'exact', head: true }).not('estado', 'eq', 'RECONCILIADO'),
    supabase.from('pagos').select('*', { count: 'exact', head: true }).eq('estado', 'PENDIENTE'),
    supabase.from('provisiones_fondos').select('*', { count: 'exact', head: true }).eq('estado', 'PENDIENTE').lte('fecha_vencimiento', new Date(Date.now() + 3 * 86400000).toISOString()),
    supabase.from('stock_items').select('*', { count: 'exact', head: true }).not('diferencia', 'eq', 0),
    supabase.from('alertas').select('*').eq('leida', false).order('created_at', { ascending: false }).limit(8),
    supabase.from('agent_logs').select('*').order('created_at', { ascending: false }).limit(6),
    supabase.from('remesas').select('monto_original').eq('moneda_origen', 'USD').not('estado', 'eq', 'RECONCILIADO'),
    supabase.from('remesas').select('monto_original').eq('moneda_origen', 'JPY').not('estado', 'eq', 'RECONCILIADO'),
  ])

  const stats = {
    remesasActivas:      r1.count ?? 0,
    pagosPendientes:     r2.count ?? 0,
    provisionesUrgentes: r3.count ?? 0,
    diferenciasStock:    r4.count ?? 0,
  }

  const totalUSD = (usdExposure ?? []).reduce((s: number, r: { monto_original: number }) => s + (r.monto_original || 0), 0)
  const totalJPY = (jpyExposure ?? []).reduce((s: number, r: { monto_original: number }) => s + (r.monto_original || 0), 0)

  const today = new Date().toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const STAT_CARDS = [
    { label: 'Remesas activas',      value: stats.remesasActivas,      sub: 'en curso',           icon: '📦', accent: '#4F46E5', cssAccent: '#4F46E5', bg: '#EEF2FF' },
    { label: 'Pagos pendientes',     value: stats.pagosPendientes,     sub: 'órdenes por emitir', icon: '💳', accent: '#D97706', cssAccent: '#D97706', bg: '#FFFBEB' },
    { label: 'Provisiones urgentes', value: stats.provisionesUrgentes, sub: 'vencen en ≤ 3 días', icon: '⚡', accent: stats.provisionesUrgentes > 0 ? '#DC2626' : '#059669', cssAccent: stats.provisionesUrgentes > 0 ? '#DC2626' : '#059669', bg: stats.provisionesUrgentes > 0 ? '#FEF2F2' : '#ECFDF5' },
    { label: 'Diferencias stock',    value: stats.diferenciasStock,    sub: 'SKUs sin resolver',  icon: '📊', accent: stats.diferenciasStock > 0 ? '#D97706' : '#059669', cssAccent: stats.diferenciasStock > 0 ? '#D97706' : '#059669', bg: stats.diferenciasStock > 0 ? '#FFFBEB' : '#ECFDF5' },
  ]

  return (
    <div className="min-h-screen">

      {/* ── Galactic hero ── */}
      <div className="relative overflow-hidden bg-galactic px-8 pt-10 pb-14">
        {/* Stars */}
        {STARS.map((s, i) => (
          <span
            key={i}
            className="star"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.size,
              height: s.size,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}

        {/* Nebula overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 55% 35% at 18% 55%, rgba(139,92,246,.10) 0%, transparent 65%)' }}
        />

        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Dashboard
            </p>
            <h1 className="text-[2.6rem] font-bold tracking-tight text-white leading-none">Operaciones</h1>
            <p className="text-sm mt-2.5 capitalize" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {today}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div
              className="flex items-center gap-2 px-3.5 py-2 rounded-full"
              style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: '#4ADE80', display: 'inline-block' }} />
              <span className="text-xs font-semibold" style={{ color: 'rgba(74,222,128,0.9)' }}>4 agentes activos</span>
            </div>
            <p className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>BLUEFISHING · MI TIENDA SPA</p>
          </div>
        </div>
      </div>

      {/* ── Stats grid (pulled up, overlapping hero bottom) ── */}
      <div className="px-8 -mt-8 relative z-10">
        <div className="grid grid-cols-4 gap-4 stagger">
          {STAT_CARDS.map(s => (
            <div
              key={s.label}
              className="card-stat p-5"
              style={{ ['--stat-accent' as string]: s.cssAccent, boxShadow: '0 4px 20px rgba(0,0,0,0.07)' }}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-xl text-xl flex-shrink-0"
                  style={{ background: s.bg }}
                >
                  {s.icon}
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider mt-1" style={{ color: '#A3A3A3' }}>
                  {s.sub}
                </span>
              </div>
              <p className="text-[38px] font-extrabold mono leading-none" style={{ color: s.accent }}>{s.value}</p>
              <p className="text-xs mt-2 font-semibold" style={{ color: '#525252' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── FX Exposure ── */}
      <div className="px-8 mt-5 grid grid-cols-2 gap-4">
        {[
          { flag: '🇺🇸', label: 'Exposición USD', value: `$${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, currency: 'USD', iconBg: '#FEF3C7', accent: '#D97706' },
          { flag: '🇯🇵', label: 'Exposición JPY', value: `¥${totalJPY.toLocaleString('ja-JP')}`, currency: 'JPY', iconBg: '#EEF2FF', accent: '#4F46E5' },
        ].map(fx => (
          <div key={fx.currency} className="card p-5 flex items-center gap-4">
            <div
              className="flex items-center justify-center w-12 h-12 rounded-xl text-2xl flex-shrink-0"
              style={{ background: fx.iconBg }}
            >
              {fx.flag}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#A3A3A3' }}>{fx.label}</p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-2xl font-extrabold mono leading-none" style={{ color: '#0A0A0A' }}>{fx.value}</p>
                <span
                  className="text-[11px] font-bold px-1.5 py-0.5 rounded-md"
                  style={{ background: fx.iconBg, color: fx.accent }}
                >
                  {fx.currency}
                </span>
              </div>
              <p className="text-[10px] mt-1.5" style={{ color: '#A3A3A3' }}>en remesas activas</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Bottom grid ── */}
      <div className="px-8 mt-6 pb-8 grid grid-cols-5 gap-6">

        {/* Alertas — 3/5 */}
        <div className="col-span-3 card overflow-hidden">
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
                      <span
                        className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
                        style={{ background: '#F5F5F4', color: '#737373' }}
                      >
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

        {/* Agent activity — 2/5 */}
        <div className="col-span-2 card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#E7E5E4' }}>
            <h2 className="text-sm font-bold" style={{ color: '#0A0A0A' }}>Actividad agentes</h2>
            <span className="text-[11px]" style={{ color: '#A3A3A3' }}>Últimas acciones</span>
          </div>

          {!agentLogs?.length ? (
            <EmptyState
              icon={<Bot size={20} style={{ color: '#A3A3A3' }} />}
              title="Los agentes están en espera"
              description="Se activarán cuando llegue el primer email."
            />
          ) : (
            <div>
              {(agentLogs as Array<{
                id: string; agent_name: string; accion: string
                resultado: string | null; created_at: string
              }>).map((l, i) => {
                const meta   = AGENT_META[l.agent_name] ?? { label: l.agent_name, color: '#525252', bg: '#F5F5F4' }
                const isDone = l.resultado === 'SUCCESS'
                const isErr  = l.resultado === 'ERROR'
                return (
                  <div
                    key={l.id}
                    className="flex items-center gap-3 px-5 py-3.5 transition-colors"
                    style={{ borderBottom: i < agentLogs.length - 1 ? '1px solid #F5F5F4' : 'none' }}
                  >
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                      style={{ background: meta.bg, color: meta.color }}
                    >
                      {meta.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: '#0A0A0A' }}>
                        {l.accion.replace(/_/g, ' ')}
                      </p>
                      <p className="text-[10px] mono" style={{ color: '#A3A3A3' }}>{relTime(l.created_at)}</p>
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
    </div>
  )
}
