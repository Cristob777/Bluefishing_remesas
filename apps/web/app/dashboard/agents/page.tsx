'use client'

import { useEffect, useState, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Bot } from 'lucide-react'

const AGENT_META: Record<string, { label: string; icon: string; color: string; bg: string; border: string }> = {
  invoice_intake:     { label: 'Recepción de Facturas', icon: '📄', color: '#4F46E5', bg: '#EEF2FF', border: '#C7D2FE' },
  customs_funds:      { label: 'Fondos de Aduana',       icon: '🏛️', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  din_reconciliation: { label: 'Reconciliación DIN',     icon: '📋', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  nota_debito:        { label: 'Notas AGENSA',           icon: '🧾', color: '#C2410C', bg: '#FFF7ED', border: '#FED7AA' },
  landed_cost:        { label: 'Costo Total',            icon: '💰', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
}

const AGENTS = ['invoice_intake', 'customs_funds', 'din_reconciliation', 'nota_debito', 'landed_cost']

const STARS = Array.from({ length: 28 }, (_, i) => ({
  x: ((i * 67 + 13) % 100), y: ((i * 43 + 31) % 100),
  size: i % 4 === 0 ? 1.5 : 1, delay: (i * 0.2) % 3,
}))

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
  const [logs, setLogs]             = useState<AgentLog[]>([])
  const [loading, setLoading]       = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const newIds                      = useRef<Set<string>>(new Set())

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

  return (
    <div className="min-h-screen">

      {/* Galactic header */}
      <div className="relative overflow-hidden px-8 pt-10 pb-12" style={{
        background: 'radial-gradient(ellipse 60% 60% at 50% -20%, #0d081e 0%, #080a1c 60%, #04050f 100%)',
      }}>
        {STARS.map((s, i) => (
          <span key={i} className="star" style={{
            left: `${s.x}%`, top: `${s.y}%`,
            width: s.size, height: s.size, animationDelay: `${s.delay}s`,
          }} />
        ))}
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>Sistema</p>
          <h1 className="text-4xl font-bold text-white">Agentes</h1>
          <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>5 agentes Claude activos · actividad en tiempo real</p>
        </div>
      </div>

      {/* Agent cards */}
      <div className="px-8 -mt-6 relative z-10">
        <div className="grid grid-cols-5 gap-4 stagger">
          {AGENTS.map(agent => {
            const meta  = AGENT_META[agent] ?? { label: agent, icon: '🤖', color: '#525252', bg: '#F5F5F4', border: '#E7E5E4' }
            const stats = counts[agent] ?? { success: 0, error: 0 }
            return (
              <div
                key={agent}
                className="rounded-xl border bg-white p-5"
                style={{ borderColor: meta.border, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-xl text-xl"
                    style={{ background: meta.bg }}
                  >
                    {meta.icon}
                  </div>
                  <span
                    className="w-2 h-2 rounded-full animate-pulse-dot"
                    style={{ background: stats.error > 0 ? '#DC2626' : '#4ADE80', display: 'inline-block' }}
                  />
                </div>
                <p className="text-sm font-semibold leading-tight mb-3" style={{ color: meta.color }}>{meta.label}</p>
                <div className="flex gap-5">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#A3A3A3' }}>OK</p>
                    <p className="text-2xl font-extrabold mono" style={{ color: '#059669' }}>{stats.success}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#A3A3A3' }}>Error</p>
                    <p className="text-2xl font-extrabold mono" style={{ color: '#DC2626' }}>{stats.error}</p>
                  </div>
                </div>
                {stats.last && (
                  <p className="text-[10px] mono mt-3" style={{ color: '#A3A3A3' }}>Última: {relTime(stats.last)}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Live log feed */}
      <div className="px-8 mt-6 pb-8">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#E7E5E4' }}>
            <h2 className="text-sm font-bold" style={{ color: '#0A0A0A' }}>Feed de eventos</h2>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse-dot" />
              <span className="text-[11px] mono" style={{ color: '#A3A3A3' }}>en vivo · últimos 100</span>
            </div>
          </div>

          {loading ? (
            <div className="divide-y" style={{ borderColor: '#F5F5F4' }}>
              {[0,1,2,3,4].map(i => (
                <div key={i} className="flex items-center gap-4 px-5 py-3">
                  <div className="skeleton h-3 w-10 rounded" />
                  <div className="skeleton h-4 w-20 rounded" />
                  <div className="skeleton h-3 flex-1 rounded" />
                  <div className="skeleton h-4 w-14 rounded" />
                </div>
              ))}
            </div>
          ) : !logs.length ? (
            <EmptyState
              icon={<Bot size={20} style={{ color: '#A3A3A3' }} />}
              title="Agentes en espera"
              description="Se activarán cuando llegue el primer correo. Conecta Gmail para comenzar."
            />
          ) : (
            <div className="divide-y" style={{ borderColor: '#F5F5F4' }}>
              {logs.map(l => {
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
    </div>
  )
}
