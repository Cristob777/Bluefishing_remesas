import Link from 'next/link'
import {
  ArrowRight,
  Bot,
  Calendar,
  CheckCircle2,
  Download,
  FileText,
  Landmark,
  Package,
  Settings,
  ShieldCheck,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { createServerClient } from '@/lib/supabase'
import { EmptyState } from '@/components/ui/EmptyState'
import { OnboardingHero } from '@/components/ui/OnboardingHero'
import { GmailErrorBanner } from '@/components/ui/GmailErrorBanner'
import { AgentStrip, Confidence, KpiCard, Section, StatusPill } from '@/components/dashboard/Kit'

export const dynamic = 'force-dynamic'

type AgentLogRow = {
  id: string
  agent_name: string
  accion: string
  resultado: string | null
  payload?: Record<string, unknown> | null
  error_mensaje?: string | null
  created_at: string
}

type RecentRemesa = {
  id: string
  numero_invoice: string
  monto_original: number
  moneda_origen: string
  estado: string
  created_at: string
  proveedor: Array<{ nombre: string; pais?: string | null }> | { nombre: string; pais?: string | null } | null
}

type RecentDoc = {
  id: string
  tipo: string
  numero: string | null
  monto: number | null
  moneda: string | null
  confianza: number | null
  agente_nombre: string | null
  created_at: string
  remesa?: {
    numero_invoice: string
    proveedor?: Array<{ nombre: string }> | { nombre: string } | null
  } | null
}

type AlertRow = {
  id: string
  tipo: string
  mensaje: string
  urgente: boolean
  destinatario: string
  created_at: string
}

const AGENT_META: Record<string, { label: string; icon: LucideIcon }> = {
  invoice_intake:     { label: 'Inbox agent', icon: FileText },
  customs_funds:      { label: 'Customs agent', icon: Landmark },
  din_reconciliation: { label: 'DIN agent', icon: ShieldCheck },
  nota_debito:        { label: 'Agensa agent', icon: FileText },
  landed_cost:        { label: 'Cost agent', icon: Package },
  manual_action:      { label: 'Manual', icon: CheckCircle2 },
  imap_poller:        { label: 'Gmail poller', icon: Bot },
}

const STATUS_META: Record<string, { label: string; variant: Parameters<typeof StatusPill>[0]['variant']; progress: number }> = {
  INVOICE_RECIBIDO:    { label: 'Factura',      variant: 'idle',    progress: 0.12 },
  PAGO_PENDIENTE:      { label: 'Por pagar',    variant: 'pending', progress: 0.24 },
  PAGO_PARCIAL:        { label: 'Parcial',      variant: 'pending', progress: 0.32 },
  PAGO_COMPLETO:       { label: 'Pagado',       variant: 'success', progress: 0.46 },
  EN_ADUANA:           { label: 'Aduana',       variant: 'review',  progress: 0.58 },
  PROVISION_RECIBIDA:  { label: 'Provisión',    variant: 'info',    progress: 0.7 },
  MERCADERIA_RECIBIDA: { label: 'Recibida',     variant: 'info',    progress: 0.82 },
  SALDO_FAVOR:         { label: 'Nota Agensa',  variant: 'review',  progress: 0.9 },
  RECONCILIADO:        { label: 'Conciliado',   variant: 'success', progress: 1 },
}

const DOC_LABEL: Record<string, string> = {
  INVOICE: 'Invoice',
  DIN: 'DIN',
  FACTURA_AGENSA: 'Fact. Agensa',
  PROVISION: 'Provisión',
  NOTA_DEBITO: 'Nota débito',
  NOTA_CREDITO: 'Nota crédito',
  OTRO: 'Otro',
}

function fmtMonto(n: number, moneda: string) {
  if (moneda === 'JPY') return `JPY ${n.toLocaleString('ja-JP')}`
  if (moneda === 'CLP') {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
  }
  return `${moneda} ${n.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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

function supplierName(remesa: RecentRemesa) {
  const proveedor = Array.isArray(remesa.proveedor) ? remesa.proveedor[0] : remesa.proveedor
  return proveedor?.nombre ?? 'Sin proveedor'
}

function dedupeLogs(logs: AgentLogRow[]) {
  const out: Array<AgentLogRow & { count: number; last_at: string }> = []
  for (const log of logs) {
    const last = out[out.length - 1]
    if (last && last.agent_name === log.agent_name && last.accion === log.accion && last.resultado === log.resultado) {
      last.count++
      last.last_at = log.created_at
    } else {
      out.push({ ...log, count: 1, last_at: log.created_at })
    }
  }
  return out
}

function progressColor(estado: string) {
  if (estado === 'RECONCILIADO') return 'var(--success)'
  if (estado === 'SALDO_FAVOR') return 'var(--warning)'
  return 'var(--accent)'
}

function ActionPreview({ alert }: { alert: AlertRow }) {
  return (
    <div className="grid overflow-hidden rounded-xl border bg-white" style={{ gridTemplateColumns: '4px 1fr auto', borderColor: 'var(--border-default)', boxShadow: 'var(--shadow-xs)' }}>
      <div style={{ background: alert.urgente ? 'var(--danger)' : 'var(--warning)' }} />
      <div className="px-4 py-3">
        <div className="mb-1 flex items-center gap-2">
          <span className={`badge ${alert.urgente ? 'badge--red' : 'badge--amber'}`}><span className="dot" />{alert.urgente ? 'Urgente' : 'Revisión'}</span>
          <span className="tnum text-[11px]" style={{ color: 'var(--fg-4)' }}>{relTime(alert.created_at)}</span>
        </div>
        <div className="mb-1 text-sm font-semibold" style={{ color: 'var(--fg-1)' }}>{alert.tipo.replace(/_/g, ' ')}</div>
        <p className="max-w-[760px] truncate text-xs" style={{ color: 'var(--fg-2)' }}>{alert.mensaje}</p>
        <div className="mt-2">
          <AgentStrip compact>Requiere decisión humana con evidencia antes de cerrar el expediente.</AgentStrip>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3">
        <Link href="/dashboard/actions" className="btn btn--primary btn--sm">Resolver</Link>
      </div>
    </div>
  )
}

export default async function OverviewPage() {
  const supabase = createServerClient()
  if (!supabase) {
    return (
      <div className="flex min-h-full items-center justify-center p-8">
        <EmptyState
          icon={<Settings size={22} />}
          title="Configuración pendiente"
          description="Faltan variables de Supabase para cargar el dashboard."
        />
      </div>
    )
  }

  const soon = new Date(Date.now() + 3 * 86400000).toISOString()
  const [
    rActive,
    rPendingPayments,
    rUrgentProvisions,
    rStockDiff,
    rProviders,
    rAllRemesas,
    { data: alertas },
    { data: agentLogs },
    { data: usdExposure },
    { data: jpyExposure },
    { data: recentRemesas },
    { data: recentDocs },
  ] = await Promise.all([
    supabase.from('remesas').select('*', { count: 'exact', head: true }).not('estado', 'eq', 'RECONCILIADO'),
    supabase.from('pagos').select('*', { count: 'exact', head: true }).eq('estado', 'PENDIENTE'),
    supabase.from('provisiones_fondos').select('*', { count: 'exact', head: true }).eq('estado', 'PENDIENTE').lte('fecha_vencimiento', soon),
    supabase.from('stock_items').select('*', { count: 'exact', head: true }).not('diferencia', 'eq', 0),
    supabase.from('proveedores').select('*', { count: 'exact', head: true }),
    supabase.from('remesas').select('*', { count: 'exact', head: true }),
    supabase.from('alertas').select('*').eq('leida', false).order('created_at', { ascending: false }).limit(5),
    supabase.from('agent_logs').select('*').order('created_at', { ascending: false }).limit(40),
    supabase.from('remesas').select('monto_original').eq('moneda_origen', 'USD').not('estado', 'eq', 'RECONCILIADO'),
    supabase.from('remesas').select('monto_original').eq('moneda_origen', 'JPY').not('estado', 'eq', 'RECONCILIADO'),
    supabase.from('remesas')
      .select('id, numero_invoice, monto_original, moneda_origen, estado, created_at, proveedor:proveedores(nombre,pais)')
      .order('created_at', { ascending: false })
      .limit(6),
    supabase.from('documentos')
      .select('id, tipo, numero, monto, moneda, created_at, agente_nombre, confianza, remesa:remesas(numero_invoice, proveedor:proveedores(nombre))')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const proveedoresCount = rProviders.count ?? 0
  const remesasTotal = rAllRemesas.count ?? 0
  const logs = (agentLogs ?? []) as AgentLogRow[]
  const lastImapLog = logs.find(l => l.agent_name === 'imap_poller')
  const gmailBroken = lastImapLog?.resultado === 'ERROR'

  if (proveedoresCount === 0 && remesasTotal === 0) {
    return (
      <div className="min-h-full">
        {gmailBroken && <GmailErrorBanner lastErrorAt={lastImapLog?.created_at} />}
        <OnboardingHero
          companyName={process.env.NEXT_PUBLIC_COMPANY_DISPLAY ?? 'tu empresa'}
          steps={[
            { id: 'gmail', label: 'Conectar Gmail de operaciones', done: !gmailBroken, href: '/api/gmail-auth' },
            { id: 'suppliers', label: 'Agregar tu primer proveedor', done: false, hint: 'Se crea automáticamente al recibir la primera factura' },
            { id: 'invoice', label: 'Recibir tu primera factura', done: false, hint: 'Reenvía un correo de proveedor al buzón conectado' },
            { id: 'pago', label: 'Confirmar tu primer pago', done: false, hint: 'Disponible cuando llegue la primera factura' },
          ]}
        />
      </div>
    )
  }

  const openAlerts = alertas?.length ?? 0
  const totalUSD = (usdExposure ?? []).reduce((s: number, r: { monto_original: number }) => s + (r.monto_original || 0), 0)
  const totalJPY = (jpyExposure ?? []).reduce((s: number, r: { monto_original: number }) => s + (r.monto_original || 0), 0)
  const ownerName = (process.env.NEXT_PUBLIC_OWNER_DISPLAY ?? 'María Rojas').split(' ')[0]
  const today = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
  const activeAgents = dedupeLogs(logs)
    .filter(log => log.agent_name !== 'imap_poller')
    .slice(0, 5)
  const pendingTotal = openAlerts + (rPendingPayments.count ?? 0) + (rUrgentProvisions.count ?? 0) + (rStockDiff.count ?? 0)
  const remesas = (recentRemesas ?? []) as unknown as RecentRemesa[]
  const docs = ((recentDocs ?? []) as unknown as Array<RecentDoc & { remesa?: RecentDoc['remesa'] | RecentDoc['remesa'][] }>)
    .map(doc => ({
      ...doc,
      remesa: Array.isArray(doc.remesa) ? doc.remesa[0] ?? null : doc.remesa ?? null,
    }))
  const pendingAlerts = (alertas ?? []) as unknown as AlertRow[]

  return (
    <div className="dashboard-page">
      {gmailBroken && <GmailErrorBanner lastErrorAt={lastImapLog?.created_at} />}

      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="t-h1 m-0 mb-1">{greeting()}, {ownerName}</h1>
          <p className="text-[13px] capitalize" style={{ color: 'var(--fg-3)' }}>
            {pendingTotal} acciones pendientes y {rActive.count ?? 0} remesas activas · {today}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn--ghost">
            <Calendar size={13} strokeWidth={1.75} />
            Últimos 7 días
          </button>
          <button className="btn btn--secondary">
            <Download size={13} strokeWidth={1.75} />
            Exportar
          </button>
        </div>
      </div>

      <div className="mb-7 grid grid-cols-4 gap-3">
        <KpiCard label="Acciones pendientes" value={pendingTotal} delta={`${openAlerts} excepciones`} tone={pendingTotal > 0 ? 'warning' : 'success'} />
        <KpiCard label="Remesas activas" value={rActive.count ?? 0} delta={`${remesasTotal} total`} />
        <KpiCard label="Exposición USD" value={`$${totalUSD.toLocaleString('es-CL', { maximumFractionDigits: 0 })}`} delta="abiertas" />
        <KpiCard label="Exposición JPY" value={`¥${totalJPY.toLocaleString('ja-JP')}`} delta="abiertas" />
      </div>

      <Section
        title="Acciones pendientes"
        action={<Link href="/dashboard/actions" className="btn btn--ghost btn--sm">Ver todas <ArrowRight size={12} /></Link>}
      >
        {pendingAlerts.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<CheckCircle2 size={22} style={{ color: 'var(--success)' }} />}
              title="Sin acciones pendientes"
              description="Cuando un pago, DIN, stock o nota Agensa requiera decisión, aparecerá aquí."
            />
          </div>
        ) : (
          <div className="stagger-children flex flex-col gap-2">
            {pendingAlerts.slice(0, 3).map(alert => <ActionPreview key={alert.id} alert={alert} />)}
          </div>
        )}
      </Section>

      <div className="grid grid-cols-[1.6fr_1fr] gap-5">
        <Section
          title="Remesas activas"
          action={<Link href="/dashboard/remesas" className="btn btn--ghost btn--sm">Ver todas <ArrowRight size={12} /></Link>}
        >
          <div className="card overflow-hidden p-0">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Remesa</th>
                  <th>Proveedor</th>
                  <th>Estado</th>
                  <th>Avance</th>
                  <th className="num">Monto</th>
                  <th>Creada</th>
                </tr>
              </thead>
              <tbody>
                {remesas.map((r, i) => {
                  const status = STATUS_META[r.estado] ?? { label: r.estado, variant: 'idle' as const, progress: 0.1 }
                  return (
                    <tr key={r.id} className={i === 0 ? 'is-selected' : ''}>
                      <td>
                        <Link href={`/dashboard/remesas?focus=${r.id}`} className="tnum inline-flex items-center gap-1.5 font-medium" style={{ color: 'var(--fg-1)' }}>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--agent)' }} />
                          {r.numero_invoice}
                        </Link>
                      </td>
                      <td>{supplierName(r)}</td>
                      <td><StatusPill variant={status.variant}>{status.label}</StatusPill></td>
                      <td>
                        <span className="inline-flex items-center gap-2">
                          <span className="inline-block h-1 w-[76px] overflow-hidden rounded-full" style={{ background: 'var(--bg-muted)' }}>
                            <span className="block h-full rounded-full" style={{ width: `${status.progress * 100}%`, background: progressColor(r.estado) }} />
                          </span>
                          <span className="tnum text-[11px]" style={{ color: 'var(--fg-3)' }}>{Math.round(status.progress * 100)}%</span>
                        </span>
                      </td>
                      <td className="num tnum">{fmtMonto(r.monto_original, r.moneda_origen)}</td>
                      <td>
                        <span className="text-xs" style={{ color: 'var(--fg-3)' }}>{relTime(r.created_at)}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Section>

        <Section
          title="Agentes"
          action={<Link href="/dashboard/agents" className="btn btn--ghost btn--sm">Ver todos <ArrowRight size={12} /></Link>}
        >
          <div className="card overflow-hidden p-0">
            {activeAgents.length === 0 ? (
              <EmptyState
                icon={<Bot size={22} />}
                title="Agentes en espera"
                description="Se activan cuando llegan correos o documentos nuevos."
              />
            ) : (
              activeAgents.map((agent, i) => {
                const meta = AGENT_META[agent.agent_name] ?? { label: agent.agent_name, icon: Bot }
                const Icon = meta.icon
                return (
                  <div
                    key={agent.id}
                    className="grid items-center gap-2.5 px-3.5 py-2.5"
                    style={{ gridTemplateColumns: '28px 1fr auto', borderBottom: i < activeAgents.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-md text-white" style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #5B6FE0 60%, #2563EB 100%)' }}>
                      <Icon size={14} strokeWidth={1.6} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: 'var(--fg-1)' }}>
                        {meta.label}
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: agent.resultado === 'ERROR' ? 'var(--danger)' : 'var(--agent)' }} />
                      </div>
                      <p className="truncate text-[11px]" style={{ color: 'var(--fg-3)' }}>{agent.accion.replace(/_/g, ' ')}</p>
                    </div>
                    <div className="text-right">
                      <div className="tnum text-[11px]" style={{ color: 'var(--fg-4)' }}>{relTime(agent.created_at)}</div>
                      {agent.count > 1 && <div className="tnum text-[10px]" style={{ color: 'var(--fg-4)' }}>x{agent.count}</div>}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </Section>
      </div>

      <Section
        title="Últimos documentos procesados"
        action={<Link href="/dashboard/documentos" className="btn btn--ghost btn--sm">Ver todos <ArrowRight size={12} /></Link>}
      >
        <div className="card overflow-hidden p-0">
          {docs.length === 0 ? (
            <EmptyState
              icon={<FileText size={22} />}
              title="Sin documentos procesados"
              description="Invoices, DIN y respaldos de Agensa aparecerán cuando los agentes los lean."
            />
          ) : (
            docs.map((doc, i) => (
              <div
                key={doc.id}
                className="grid items-center gap-3 px-4 py-3"
                style={{ gridTemplateColumns: '28px 1fr auto auto auto', borderBottom: i < docs.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ background: 'var(--bg-subtle)', color: 'var(--fg-3)' }}>
                  <FileText size={14} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium" style={{ color: 'var(--fg-1)' }}>{doc.numero ?? doc.id.slice(0, 8)}</div>
                  <div className="truncate text-[11px]" style={{ color: 'var(--fg-4)' }}>{doc.agente_nombre ?? 'agente'} · {relTime(doc.created_at)}</div>
                </div>
                <span className="badge badge--violet">{DOC_LABEL[doc.tipo] ?? doc.tipo}</span>
                {doc.confianza != null ? <Confidence value={doc.confianza} /> : <span className="text-[11px]" style={{ color: 'var(--fg-4)' }}>sin score</span>}
                <span className="tnum text-[11px]" style={{ color: 'var(--fg-4)' }}>{doc.monto != null && doc.moneda ? fmtMonto(doc.monto, doc.moneda) : '—'}</span>
              </div>
            ))
          )}
        </div>
      </Section>
    </div>
  )
}
