import type { ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardList,
  FileText,
  GitBranch,
  Inbox,
  Landmark,
  Package,
  Search,
  ShieldCheck,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { createServerClient } from '@/lib/supabase'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { OnboardingHero } from '@/components/ui/OnboardingHero'
import { GmailErrorBanner } from '@/components/ui/GmailErrorBanner'

function fmtMonto(n: number, moneda: string) {
  if (moneda === 'JPY') return `¥${n.toLocaleString('ja-JP')}`
  if (moneda === 'CLP') {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(n)
  }
  return `${moneda} ${n.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtCLP(n: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n)
}

function relTime(iso: string | null | undefined) {
  if (!iso) return 'sin fecha'
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  return `hace ${Math.floor(h / 24)} d`
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

const AGENT_META: Record<string, { label: string; color: string; bg: string }> = {
  invoice_intake:     { label: 'Factura', color: '#4F46E5', bg: '#EEF2FF' },
  customs_funds:      { label: 'Aduana', color: '#D97706', bg: '#FFFBEB' },
  din_reconciliation: { label: 'DIN', color: '#7C3AED', bg: '#F5F3FF' },
  nota_debito:        { label: 'Nota AGENSA', color: '#C2410C', bg: '#FFF7ED' },
  landed_cost:        { label: 'Costo', color: '#059669', bg: '#ECFDF5' },
  manual_action:      { label: 'Manual', color: '#525252', bg: '#F5F5F4' },
  imap_poller:        { label: 'Gmail', color: '#525252', bg: '#F5F5F4' },
}

const ALERTA_ICON: Record<string, LucideIcon> = {
  PROVISION_URGENTE:    Landmark,
  PAGO_PENDIENTE:       ClipboardList,
  DIFERENCIA_STOCK:     Package,
  APROBACION_REQUERIDA: ShieldCheck,
  SALDO_FAVOR_AGENSA:   FileText,
}

const ESTADO_COLOR: Record<string, { color: string; bg: string; label: string }> = {
  INVOICE_RECIBIDO:    { color: '#525252', bg: '#F5F5F4', label: 'Factura' },
  PAGO_PENDIENTE:      { color: '#D97706', bg: '#FFFBEB', label: 'Por pagar' },
  PAGO_PARCIAL:        { color: '#B45309', bg: '#FEF3C7', label: 'Parcial' },
  PAGO_COMPLETO:       { color: '#059669', bg: '#ECFDF5', label: 'Pagado' },
  EN_ADUANA:           { color: '#7C3AED', bg: '#F5F3FF', label: 'Aduana' },
  PROVISION_RECIBIDA:  { color: '#2563EB', bg: '#EFF6FF', label: 'Provisión' },
  MERCADERIA_RECIBIDA: { color: '#0891B2', bg: '#ECFEFF', label: 'Recibida' },
  SALDO_FAVOR:         { color: '#B45309', bg: '#FEF3C7', label: 'Saldo AGENSA' },
  RECONCILIADO:        { color: '#059669', bg: '#ECFDF5', label: 'Reconciliado' },
}

const DOC_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  INVOICE:        { color: '#4F46E5', bg: '#EEF2FF', label: 'Invoice' },
  DIN:            { color: '#7C3AED', bg: '#F5F3FF', label: 'DIN' },
  FACTURA_AGENSA: { color: '#D97706', bg: '#FFFBEB', label: 'Fact. AGENSA' },
  PROVISION:      { color: '#DC2626', bg: '#FEF2F2', label: 'Provisión' },
  NOTA_DEBITO:    { color: '#C2410C', bg: '#FFF7ED', label: 'Nota débito' },
  NOTA_CREDITO:   { color: '#059669', bg: '#ECFDF5', label: 'Nota crédito' },
  OTRO:           { color: '#525252', bg: '#F5F5F4', label: 'Otro' },
}

interface AgentLogRow {
  id: string
  agent_name: string
  accion: string
  resultado: string | null
  payload?: Record<string, unknown> | null
  error_mensaje?: string | null
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

function SectionCard({
  title,
  eyebrow,
  actionHref,
  actionLabel,
  children,
  className = '',
}: {
  title: string
  eyebrow?: string
  actionHref?: string
  actionLabel?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`bg-white rounded-xl border overflow-hidden ${className}`} style={{ borderColor: '#E7E5E4' }}>
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#E7E5E4' }}>
        <div>
          {eyebrow && (
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-1" style={{ color: '#A3A3A3' }}>
              {eyebrow}
            </p>
          )}
          <h2 className="text-sm font-bold" style={{ color: '#0A0A0A' }}>{title}</h2>
        </div>
        {actionHref && (
          <a href={actionHref} className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: '#4F46E5' }}>
            {actionLabel ?? 'Ver'} <ArrowRight size={12} />
          </a>
        )}
      </div>
      {children}
    </section>
  )
}

function SignalCard({
  label,
  value,
  sub,
  accent,
  Icon,
}: {
  label: string
  value: string | number
  sub: string
  accent: string
  Icon: LucideIcon
}) {
  return (
    <div className="bg-white rounded-xl p-5 border" style={{ borderColor: '#E7E5E4', borderLeft: `3px solid ${accent}`, boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
      <div className="flex items-center justify-between mb-4">
        <Icon size={18} style={{ color: accent }} />
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#A3A3A3' }}>
          {sub}
        </span>
      </div>
      <p className="text-[34px] font-extrabold leading-none mono" style={{ color: accent }}>{value}</p>
      <p className="text-xs mt-2 font-semibold" style={{ color: '#525252' }}>{label}</p>
    </div>
  )
}

function ProgressRail({ steps }: { steps: Array<{ label: string; value: number; color: string }> }) {
  const max = Math.max(...steps.map(s => s.value), 1)
  return (
    <div className="grid grid-cols-4 gap-3">
      {steps.map(step => {
        const pct = Math.max((step.value / max) * 100, step.value > 0 ? 18 : 8)
        return (
          <div key={step.label} className="rounded-lg border p-3" style={{ borderColor: '#E7E5E4', background: '#FAFAF9' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#737373' }}>{step.label}</p>
              <span className="text-xs font-bold mono" style={{ color: step.color }}>{step.value}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#E7E5E4' }}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: step.color }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function confidenceLabel(value: number | null | undefined) {
  if (value == null) return 'sin confianza'
  return `${Math.round(value * 100)}% confianza`
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
    rActive,
    rPendingPayments,
    rUrgentProvisions,
    rStockDiff,
    rProviders,
    rConfirmedPayments,
    rAllRemesas,
    { data: alertas },
    { data: agentLogs },
    { data: usdExposure },
    { data: jpyExposure },
    { data: recentRemesas },
    { data: recentDocs },
    { data: reglas },
  ] = await Promise.all([
    supabase.from('remesas').select('*', { count: 'exact', head: true }).not('estado', 'eq', 'RECONCILIADO'),
    supabase.from('pagos').select('*', { count: 'exact', head: true }).eq('estado', 'PENDIENTE'),
    supabase.from('provisiones_fondos').select('*', { count: 'exact', head: true }).eq('estado', 'PENDIENTE').lte('fecha_vencimiento', new Date(Date.now() + 3 * 86400000).toISOString()),
    supabase.from('stock_items').select('*', { count: 'exact', head: true }).not('diferencia', 'eq', 0),
    supabase.from('proveedores').select('*', { count: 'exact', head: true }),
    supabase.from('pagos').select('*', { count: 'exact', head: true }).eq('estado', 'CONFIRMADO'),
    supabase.from('remesas').select('*', { count: 'exact', head: true }),
    supabase.from('alertas').select('*').eq('leida', false).order('created_at', { ascending: false }).limit(6),
    supabase.from('agent_logs').select('*').order('created_at', { ascending: false }).limit(24),
    supabase.from('remesas').select('monto_original').eq('moneda_origen', 'USD').not('estado', 'eq', 'RECONCILIADO'),
    supabase.from('remesas').select('monto_original').eq('moneda_origen', 'JPY').not('estado', 'eq', 'RECONCILIADO'),
    supabase.from('remesas')
      .select('id, numero_invoice, monto_original, moneda_origen, estado, created_at, proveedor:proveedores(nombre)')
      .order('created_at', { ascending: false })
      .limit(6),
    supabase.from('documentos')
      .select('id, tipo, numero, monto, moneda, created_at, agente_nombre, confianza, remesa:remesas(numero_invoice, proveedor:proveedores(nombre))')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('reglas')
      .select('id, nombre, activa, veces_ejecutada, ultima_ejecucion')
      .order('ultima_ejecucion', { ascending: false, nullsFirst: false })
      .limit(5),
  ])

  const proveedoresCount = rProviders.count ?? 0
  const remesasTotal = rAllRemesas.count ?? 0
  const pagosConfirmados = rConfirmedPayments.count ?? 0
  const isFirstRun = proveedoresCount === 0 && remesasTotal === 0

  const recentLogs = (agentLogs ?? []) as AgentLogRow[]
  const lastImapLog = recentLogs.find(l => l.agent_name === 'imap_poller')
  const gmailBroken = lastImapLog?.resultado === 'ERROR'
  const lastErrorAt = gmailBroken ? lastImapLog!.created_at : undefined

  if (isFirstRun) {
    return (
      <div className="min-h-screen">
        {gmailBroken && <GmailErrorBanner lastErrorAt={lastErrorAt} />}
        <OnboardingHero
          companyName={process.env.NEXT_PUBLIC_COMPANY_DISPLAY ?? 'tu empresa'}
          steps={[
            { id: 'gmail', label: 'Conectar Gmail de operaciones', done: !gmailBroken && (pagosConfirmados + remesasTotal) > 0, href: '/api/gmail-auth' },
            { id: 'suppliers', label: 'Agregar tu primer proveedor', done: proveedoresCount > 0, hint: 'Se crea automáticamente al recibir la primera factura' },
            { id: 'invoice', label: 'Recibir tu primera factura', done: remesasTotal > 0, hint: 'Reenvía un correo de proveedor al buzón conectado' },
            { id: 'pago', label: 'Confirmar tu primer pago', done: pagosConfirmados > 0, hint: 'Disponible cuando llegue la primera factura' },
          ]}
        />
      </div>
    )
  }

  const stats = {
    remesasActivas: rActive.count ?? 0,
    pagosPendientes: rPendingPayments.count ?? 0,
    provisionesUrgentes: rUrgentProvisions.count ?? 0,
    diferenciasStock: rStockDiff.count ?? 0,
  }

  const totalUSD = (usdExposure ?? []).reduce((s: number, r: { monto_original: number }) => s + (r.monto_original || 0), 0)
  const totalJPY = (jpyExposure ?? []).reduce((s: number, r: { monto_original: number }) => s + (r.monto_original || 0), 0)
  const openAlerts = alertas?.length ?? 0
  const activeRules = (reglas ?? []).filter(r => r.activa).length
  const dedupedLogs = dedupeLogs(recentLogs).slice(0, 7)
  const latestDecision = recentLogs.find(l => l.agent_name !== 'imap_poller')
  const latestPayload = latestDecision?.payload && typeof latestDecision.payload === 'object'
    ? Object.entries(latestDecision.payload).filter(([, v]) => v !== null && v !== undefined).slice(0, 4)
    : []

  const today = new Date().toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const ownerName = (process.env.NEXT_PUBLIC_OWNER_DISPLAY ?? 'Admin').split(' ')[0]

  const signalCards = [
    { label: 'Acciones pendientes', value: openAlerts + stats.pagosPendientes + stats.provisionesUrgentes + stats.diferenciasStock, sub: 'review queue', accent: openAlerts > 0 ? '#DC2626' : '#059669', Icon: ClipboardList },
    { label: 'Remesas activas', value: stats.remesasActivas, sub: 'expedientes', accent: '#4F46E5', Icon: Package },
    { label: 'Documentos IA', value: recentDocs?.length ?? 0, sub: 'últimos procesados', accent: '#06B6D4', Icon: FileText },
    { label: 'Reglas activas', value: activeRules, sub: 'automatización', accent: '#059669', Icon: GitBranch },
  ]

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF9' }}>
      {gmailBroken && <GmailErrorBanner lastErrorAt={lastErrorAt} />}

      <div className="border-b bg-white px-8 py-6" style={{ borderColor: '#E7E5E4' }}>
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] mb-1" style={{ color: '#4F46E5' }}>
              Command center
            </p>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#0A0A0A' }}>
              {greeting()}, {ownerName}
            </h1>
            <p className="text-sm mt-1 capitalize" style={{ color: '#737373' }}>
              {today} · remesas, documentos, reglas y agentes en una sola vista
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/dashboard/remesas"
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold"
              style={{ background: '#F5F5F4', color: '#525252', border: '1px solid #E7E5E4' }}
            >
              <Search size={14} /> Buscar expediente
            </a>
            <a
              href="/dashboard/actions"
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white"
              style={{ background: '#4F46E5' }}
            >
              <Zap size={14} /> Resolver acciones
            </a>
          </div>
        </div>
      </div>

      <main className="space-y-5 px-8 py-6">
        <div className="grid grid-cols-4 gap-4">
          {signalCards.map(card => <SignalCard key={card.label} {...card} />)}
        </div>

        <SectionCard title="Flujo operativo" eyebrow="Reverse engineered: Numra + Wove + Flexport">
          <div className="p-5 space-y-4">
            <ProgressRail
              steps={[
                { label: 'Inbox', value: recentDocs?.length ?? 0, color: '#06B6D4' },
                { label: 'Review', value: openAlerts, color: openAlerts > 0 ? '#DC2626' : '#059669' },
                { label: 'Aduana', value: stats.provisionesUrgentes, color: stats.provisionesUrgentes > 0 ? '#D97706' : '#059669' },
                { label: 'Cierre', value: stats.remesasActivas, color: '#4F46E5' },
              ]}
            />

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border p-3" style={{ borderColor: '#E7E5E4', background: '#FAFAF9' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#A3A3A3' }}>Exposición USD</p>
                <p className="text-lg font-extrabold mono" style={{ color: '#0A0A0A' }}>${totalUSD.toLocaleString('es-CL', { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="rounded-lg border p-3" style={{ borderColor: '#E7E5E4', background: '#FAFAF9' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#A3A3A3' }}>Exposición JPY</p>
                <p className="text-lg font-extrabold mono" style={{ color: '#0A0A0A' }}>¥{totalJPY.toLocaleString('ja-JP')}</p>
              </div>
              <div className="rounded-lg border p-3" style={{ borderColor: '#E7E5E4', background: '#FAFAF9' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#A3A3A3' }}>Tolerancia DIN</p>
                <p className="text-lg font-extrabold mono" style={{ color: '#0A0A0A' }}>{fmtCLP(50_000)}</p>
              </div>
            </div>
          </div>
        </SectionCard>

        <div className="grid grid-cols-12 gap-5">
          <SectionCard title="Expedientes recientes" eyebrow="Flexport pattern" actionHref="/dashboard/remesas" actionLabel="Ver remesas" className="col-span-7">
            {!recentRemesas?.length ? (
              <EmptyState
                icon={<Package size={20} style={{ color: '#A3A3A3' }} />}
                title="Sin remesas"
                description="Las remesas aparecerán aquí cuando llegue la primera factura."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: '#FAFAF9', borderBottom: '1px solid #E7E5E4' }}>
                      {['Invoice', 'Proveedor', 'Monto', 'Estado', 'Creado'].map(h => (
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
                      const estado = ESTADO_COLOR[r.estado] ?? { color: '#525252', bg: '#F5F5F4', label: r.estado }
                      const proveedor = Array.isArray(r.proveedor) ? r.proveedor[0]?.nombre : r.proveedor?.nombre
                      return (
                        <tr key={r.id} className="transition-colors hover:bg-stone-50" style={{ borderBottom: i < (recentRemesas?.length ?? 0) - 1 ? '1px solid #F5F5F4' : 'none' }}>
                          <td className="px-5 py-3 text-[12px] font-semibold mono" style={{ color: '#0A0A0A' }}>{r.numero_invoice}</td>
                          <td className="px-5 py-3 text-[12px]" style={{ color: '#525252' }}>{proveedor ?? '—'}</td>
                          <td className="px-5 py-3 text-[12px] font-semibold mono" style={{ color: '#0A0A0A' }}>{fmtMonto(r.monto_original, r.moneda_origen)}</td>
                          <td className="px-5 py-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: estado.bg, color: estado.color }}>
                              {estado.label}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-[11px] mono" style={{ color: '#A3A3A3' }}>{relTime(r.created_at)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Reasoning record" eyebrow="Wove pattern" actionHref="/dashboard/agents" actionLabel="Ver agentes" className="col-span-5">
            {!latestDecision ? (
              <EmptyState
                icon={<Bot size={20} style={{ color: '#A3A3A3' }} />}
                title="Sin decisiones recientes"
                description="Cuando un agente procese documentos, su razonamiento aparecerá aquí."
              />
            ) : (
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: (AGENT_META[latestDecision.agent_name] ?? AGENT_META.manual_action).bg,
                      color: (AGENT_META[latestDecision.agent_name] ?? AGENT_META.manual_action).color,
                    }}
                  >
                    {(AGENT_META[latestDecision.agent_name] ?? AGENT_META.manual_action).label}
                  </span>
                  <span className="text-[10px] mono" style={{ color: '#A3A3A3' }}>{relTime(latestDecision.created_at)}</span>
                </div>
                <div className="rounded-lg border p-4" style={{ borderColor: '#E7E5E4', background: '#0A0A0A' }}>
                  <p className="text-[11px] font-mono leading-relaxed" style={{ color: '#D4D4D4' }}>
                    IF event == "{latestDecision.accion.replace(/_/g, ' ')}"<br />
                    THEN status == "{latestDecision.resultado ?? 'PENDING'}"<br />
                    BECAUSE source == "{latestDecision.agent_name.replace(/_/g, ' ')}"
                  </p>
                </div>
                {latestPayload.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {latestPayload.map(([key, value]) => (
                      <div key={key} className="rounded-lg p-2.5" style={{ background: '#FAFAF9', border: '1px solid #E7E5E4' }}>
                        <p className="text-[9px] font-bold uppercase tracking-wider mb-1 truncate" style={{ color: '#A3A3A3' }}>{key}</p>
                        <p className="text-[11px] font-semibold truncate" style={{ color: '#374151' }}>
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="grid grid-cols-12 gap-5">
          <SectionCard title="Document inbox" eyebrow="Numra + Stampli pattern" actionHref="/dashboard/documentos" actionLabel="Ver documentos" className="col-span-4">
            {!recentDocs?.length ? (
              <EmptyState
                icon={<Inbox size={20} style={{ color: '#A3A3A3' }} />}
                title="Sin documentos"
                description="Los agentes archivarán aquí facturas, DIN y provisiones."
              />
            ) : (
              <div>
                {((recentDocs ?? []) as unknown as Array<{
                  id: string
                  tipo: string
                  numero: string | null
                  monto: number | null
                  moneda: string | null
                  confianza: number | null
                  agente_nombre: string | null
                  created_at: string
                }>).map((doc, i) => {
                  const style = DOC_STYLE[doc.tipo] ?? DOC_STYLE.OTRO
                  return (
                    <div key={doc.id} className="px-5 py-3.5" style={{ borderBottom: i < (recentDocs?.length ?? 0) - 1 ? '1px solid #F5F5F4' : 'none' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: style.bg, color: style.color }}>{style.label}</span>
                            <span className="text-[10px] mono" style={{ color: '#A3A3A3' }}>{relTime(doc.created_at)}</span>
                          </div>
                          <p className="text-xs font-semibold truncate" style={{ color: '#0A0A0A' }}>{doc.numero ?? doc.id.slice(0, 8)}</p>
                          <p className="text-[10px] mt-0.5" style={{ color: '#A3A3A3' }}>{confidenceLabel(doc.confianza)}</p>
                        </div>
                        {doc.monto != null && doc.moneda && (
                          <span className="text-[11px] font-bold mono flex-shrink-0" style={{ color: '#374151' }}>
                            {fmtMonto(doc.monto, doc.moneda)}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Rules engine" eyebrow="Numra pattern" actionHref="/dashboard/reglas" actionLabel="Editar reglas" className="col-span-4">
            {!reglas?.length ? (
              <EmptyState
                icon={<GitBranch size={20} style={{ color: '#A3A3A3' }} />}
                title="Sin reglas configuradas"
                description="Crea reglas CUANDO / SI / ENTONCES para automatizar decisiones."
              />
            ) : (
              <div>
                {((reglas ?? []) as Array<{ id: string; nombre: string; activa: boolean; veces_ejecutada: number; ultima_ejecucion: string | null }>).map((regla, i) => (
                  <div key={regla.id} className="px-5 py-3.5" style={{ borderBottom: i < (reglas?.length ?? 0) - 1 ? '1px solid #F5F5F4' : 'none' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: '#0A0A0A' }}>{regla.nombre}</p>
                        <p className="text-[10px] mt-1" style={{ color: '#A3A3A3' }}>
                          {regla.veces_ejecutada ?? 0} ejecuciones · {relTime(regla.ultima_ejecucion)}
                        </p>
                      </div>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={regla.activa ? { background: '#ECFDF5', color: '#059669' } : { background: '#F5F5F4', color: '#737373' }}
                      >
                        {regla.activa ? 'Activa' : 'Pausada'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Excepciones" eyebrow="Stampli pattern" actionHref="/dashboard/actions" actionLabel="Resolver" className="col-span-4">
            {!alertas?.length ? (
              <EmptyState
                icon={<CheckCircle2 size={20} style={{ color: '#059669' }} />}
                title="Sin excepciones"
                description="Las alertas aparecerán cuando un pago, DIN, stock o nota AGENSA requiera revisión."
              />
            ) : (
              <div>
                {(alertas as Array<{ id: string; tipo: string; mensaje: string; urgente: boolean; destinatario: string; created_at: string }>).map((alerta, i) => {
                  const Icon = ALERTA_ICON[alerta.tipo] ?? AlertTriangle
                  return (
                    <div key={alerta.id} className="flex gap-3 px-5 py-3.5" style={{ borderBottom: i < alertas.length - 1 ? '1px solid #F5F5F4' : 'none', borderLeft: alerta.urgente ? '2px solid #DC2626' : '2px solid transparent' }}>
                      <Icon size={16} style={{ color: alerta.urgente ? '#DC2626' : '#D97706', marginTop: 2, flexShrink: 0 }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] leading-relaxed line-clamp-2" style={{ color: '#374151' }}>{alerta.mensaje}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] mono" style={{ color: '#A3A3A3' }}>{relTime(alerta.created_at)}</span>
                          {alerta.urgente && <Badge variant="urgent">Urgente</Badge>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </SectionCard>
        </div>

        <SectionCard title="Actividad de agentes" eyebrow="Audit trail" actionHref="/dashboard/agents" actionLabel="Ver logs">
          {!dedupedLogs.length ? (
            <EmptyState
              icon={<Bot size={20} style={{ color: '#A3A3A3' }} />}
              title="Agentes en espera"
              description="Se activarán cuando llegue el primer correo."
            />
          ) : (
            <div className="grid grid-cols-2">
              {dedupedLogs.map((log, i) => {
                const meta = AGENT_META[log.agent_name] ?? { label: log.agent_name, color: '#525252', bg: '#F5F5F4' }
                const isDone = log.resultado === 'SUCCESS'
                const isErr = log.resultado === 'ERROR'
                return (
                  <div
                    key={log.id}
                    className="flex items-center gap-3 px-5 py-3.5"
                    style={{
                      borderRight: i % 2 === 0 ? '1px solid #F5F5F4' : 'none',
                      borderBottom: i < dedupedLogs.length - 2 ? '1px solid #F5F5F4' : 'none',
                    }}
                  >
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: meta.bg, color: meta.color }}>
                      {meta.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: '#0A0A0A' }}>
                        {log.accion.replace(/_/g, ' ').toLowerCase()}
                        {log.count > 1 && <span className="ml-1.5 font-mono" style={{ color: '#A3A3A3' }}>x{log.count}</span>}
                      </p>
                      <p className="text-[10px] mono" style={{ color: '#A3A3A3' }}>{relTime(log.last_at)}</p>
                    </div>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                      style={
                        isDone ? { background: '#ECFDF5', color: '#059669' }
                        : isErr ? { background: '#FEF2F2', color: '#DC2626' }
                        : { background: '#FFFBEB', color: '#D97706' }
                      }
                    >
                      {log.resultado ?? '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>
      </main>
    </div>
  )
}
