'use client'

import { useEffect, useState, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import {
  Bot,
  CircleDollarSign,
  FileText,
  Landmark,
  ReceiptText,
  Search,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import { PageHeader } from '@/components/dashboard/Kit'

const AGENT_META: Record<string, { label: string; icon: LucideIcon; color: string; bg: string; border: string }> = {
  invoice_intake:     { label: 'Recepción de facturas', icon: FileText,         color: '#4F46E5', bg: '#EEF2FF', border: '#C7D2FE' },
  customs_funds:      { label: 'Fondos de aduana',      icon: Landmark,         color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  din_reconciliation: { label: 'Reconciliación DIN',    icon: ShieldCheck,      color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  nota_debito:        { label: 'Notas AGENSA',          icon: ReceiptText,      color: '#C2410C', bg: '#FFF7ED', border: '#FED7AA' },
  landed_cost:        { label: 'Costo total',           icon: CircleDollarSign, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  data_enrichment:    { label: 'Enriquecimiento',       icon: Search,           color: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC' },
}

const AGENTS = ['invoice_intake', 'customs_funds', 'din_reconciliation', 'nota_debito', 'landed_cost', 'data_enrichment']

interface AgentLog {
  id: string
  agent_name: string
  accion: string
  resultado: string | null
  session_id?: string
  remesa_id?: string | null
  payload?: Record<string, unknown> | null
  error_mensaje?: string | null
  created_at: string
}

function ReasoningPanel({ log }: { log: AgentLog }) {
  const p = log.payload
  if (!p && !log.error_mensaje) return null

  const entries = p ? Object.entries(p).filter(([, v]) => v !== null && v !== undefined) : []

  function renderVal(v: unknown): string {
    if (typeof v === 'object' && v !== null) return JSON.stringify(v, null, 2)
    if (typeof v === 'number') return v.toLocaleString('es-CL')
    return String(v)
  }

  return (
    <div className="px-5 pb-4 pt-2 space-y-3" style={{ borderTop: '1px solid #F5F5F4' }}>
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#A3A3A3' }}>
        Razonamiento del agente
      </p>
      {log.error_mensaje && (
        <div className="rounded-lg px-3 py-2 text-xs font-mono" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
          {log.error_mensaje}
        </div>
      )}
      {entries.length > 0 && (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #E7E5E4' }}>
          {entries.map(([k, v], i) => (
            <div
              key={k}
              className="grid gap-3 px-3 py-2"
              style={{
                gridTemplateColumns: '140px 1fr',
                borderBottom: i < entries.length - 1 ? '1px solid #F5F5F4' : 'none',
                background: i % 2 === 0 ? '#FAFAF9' : '#FFF',
              }}
            >
              <span className="text-[10px] font-semibold mono truncate" style={{ color: '#A3A3A3' }}>{k}</span>
              <span className="text-[11px] mono break-all" style={{ color: '#0A0A0A', whiteSpace: typeof v === 'object' ? 'pre-wrap' : 'normal' }}>
                {renderVal(v)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
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

export default function AgentsPage() {
  const [logs, setLogs]               = useState<AgentLog[]>([])
  const [loading, setLoading]         = useState(true)
  const [expandedId, setExpandedId]   = useState<string | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const newIds                        = useRef<Set<string>>(new Set())

  useEffect(() => {
    const supabase = createBrowserClient()

    supabase
      .from('agent_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setLogs(data ?? [])
        setLoading(false)
      })

    const channel = supabase
      .channel('agent-logs-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'agent_logs' },
        (payload) => {
          const row = payload.new as AgentLog
          newIds.current.add(row.id)
          setTimeout(() => newIds.current.delete(row.id), 2000)
          setLogs(prev => [row, ...prev.slice(0, 99)])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const counts: Record<string, { success: number; error: number; last?: string }> = {}
  for (const log of logs) {
    if (!counts[log.agent_name]) counts[log.agent_name] = { success: 0, error: 0 }
    if (log.resultado === 'SUCCESS') counts[log.agent_name].success++
    if (log.resultado === 'ERROR')   counts[log.agent_name].error++
    if (!counts[log.agent_name].last) counts[log.agent_name].last = log.created_at
  }

  const filteredLogs = selectedAgent ? logs.filter(l => l.agent_name === selectedAgent) : logs

  return (
    <div className="dashboard-page--wide min-h-full">
      <PageHeader
        title="Agentes"
        subtitle={`${AGENTS.length} agentes Claude · actividad en tiempo real`}
        actions={
          <div className="agent-strip">
            <Bot size={12} strokeWidth={1.75} />
            <span>{filteredLogs.length} eventos</span>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {AGENTS.map(agent => {
          const meta   = AGENT_META[agent]
          const Icon   = meta.icon
          const stats  = counts[agent] ?? { success: 0, error: 0 }
          const active = selectedAgent === agent

          return (
            <button
              key={agent}
              onClick={() => setSelectedAgent(active ? null : agent)}
              className="card p-4 text-left transition-all"
              style={{
                borderColor: active ? meta.color : meta.border,
                boxShadow: active
                  ? `0 0 0 2px ${meta.color}22, 0 4px 16px rgba(0,0,0,0.06)`
                  : '0 1px 4px rgba(0,0,0,0.04)',
                background: active ? meta.bg : '#FFF',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: meta.bg, color: meta.color }}>
                  <Icon size={16} strokeWidth={1.75} />
                </div>
                <span
                  className="w-2 h-2 rounded-full animate-pulse-dot"
                  style={{ background: stats.error > 0 ? '#DC2626' : '#4ADE80', display: 'inline-block' }}
                />
              </div>
              <p className="text-[12px] font-semibold leading-tight mb-2.5" style={{ color: meta.color }}>{meta.label}</p>
              <div className="flex gap-4">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#A3A3A3' }}>OK</p>
                  <p className="text-xl font-extrabold mono" style={{ color: '#059669' }}>{stats.success}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#A3A3A3' }}>Err</p>
                  <p className="text-xl font-extrabold mono" style={{ color: '#DC2626' }}>{stats.error}</p>
                </div>
              </div>
              {stats.last && (
                <p className="text-[10px] mono mt-2" style={{ color: '#A3A3A3' }}>{relTime(stats.last)}</p>
              )}
            </button>
          )
        })}
      </div>

      <div className="card overflow-hidden p-0">
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#E7E5E4' }}>
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold" style={{ color: '#0A0A0A' }}>Feed de eventos</h2>
            {selectedAgent && (
              <span
                className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: AGENT_META[selectedAgent]?.bg, color: AGENT_META[selectedAgent]?.color }}
              >
                {AGENT_META[selectedAgent]?.label}
                <button
                  onClick={() => setSelectedAgent(null)}
                  className="ml-0.5 opacity-60 hover:opacity-100"
                  style={{ fontSize: 12 }}
                >
                  ×
                </button>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse-dot" />
            <span className="text-[11px] mono" style={{ color: '#A3A3A3' }}>
              en vivo · {filteredLogs.length} eventos
            </span>
          </div>
        </div>

        {loading ? (
          <div className="divide-y" style={{ borderColor: '#F5F5F4' }}>
            {[0,1,2,3,4].map(i => (
              <div key={i} className="flex items-center gap-4 px-5 py-3">
                <div className="h-3 w-10 rounded animate-pulse" style={{ background: '#F5F5F4' }} />
                <div className="h-4 w-20 rounded animate-pulse" style={{ background: '#F5F5F4' }} />
                <div className="h-3 rounded animate-pulse flex-1" style={{ background: '#F5F5F4' }} />
                <div className="h-4 w-14 rounded animate-pulse" style={{ background: '#F5F5F4' }} />
              </div>
            ))}
          </div>
        ) : !filteredLogs.length ? (
          <EmptyState
            icon={<Bot size={20} style={{ color: '#A3A3A3' }} />}
            title={selectedAgent ? 'Sin eventos para este agente' : 'Agentes en espera'}
            description={selectedAgent ? 'Este agente no ha registrado actividad aún.' : 'Se activarán cuando llegue el primer correo.'}
          />
        ) : (
          <div className="divide-y" style={{ borderColor: '#F5F5F4' }}>
            {filteredLogs.map(l => {
              const meta       = AGENT_META[l.agent_name]
              const isNew      = newIds.current.has(l.id)
              const isExpanded = expandedId === l.id
              const hasPayload = !!(l.payload || l.error_mensaje)

              return (
                <div
                  key={l.id}
                  className={isNew ? 'animate-fade-in' : ''}
                  style={{ background: isExpanded ? 'rgba(79,70,229,0.02)' : isNew ? 'rgba(79,70,229,0.04)' : undefined }}
                >
                  <button
                    className="w-full flex items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-gray-50"
                    onClick={() => hasPayload && setExpandedId(isExpanded ? null : l.id)}
                    style={{ cursor: hasPayload ? 'pointer' : 'default' }}
                  >
                    <span className="text-[10px] mono flex-shrink-0 w-12 text-right" style={{ color: '#A3A3A3' }}>
                      {relTime(l.created_at)}
                    </span>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                      style={{ background: meta?.bg ?? '#F5F5F4', color: meta?.color ?? '#525252' }}
                    >
                      {meta?.label ?? l.agent_name}
                    </span>
                    <span className="text-xs font-medium flex-1 truncate" style={{ color: '#0A0A0A' }}>
                      {l.accion.replace(/_/g, ' ')}
                    </span>
                    {l.session_id && (
                      <span className="text-[10px] mono truncate max-w-[100px] hidden xl:block" style={{ color: '#A3A3A3' }}>
                        {l.session_id.slice(0, 8)}
                      </span>
                    )}
                    <Badge
                      variant={l.resultado === 'SUCCESS' ? 'success' : l.resultado === 'ERROR' ? 'urgent' : 'pending'}
                      size="sm"
                    >
                      {l.resultado === 'PENDING_APPROVAL' ? 'Aprobación' : (l.resultado ?? '—')}
                    </Badge>
                    {hasPayload && (
                      <span
                        className="text-[10px] flex-shrink-0 transition-transform duration-200"
                        style={{ color: '#A3A3A3', transform: isExpanded ? 'rotate(90deg)' : 'none' }}
                      >
                        ›
                      </span>
                    )}
                  </button>
                  {isExpanded && <ReasoningPanel log={l} />}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
