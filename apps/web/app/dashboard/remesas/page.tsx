'use client'

import { useState, useEffect } from 'react'
import { clsx } from 'clsx'
import { Plus, X, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Remesa {
  id: string
  numero_invoice: string
  estado: string
  moneda_origen: string
  monto_original: number
  condicion_pago: string | null
  numero_despacho: string | null
  fecha_invoice: string | null
  din_numero: string | null
  notas: string | null
  created_at: string
  updated_at: string
  proveedor?: { nombre: string; pais: string; moneda: string }
  pagos?: Array<{ id: string; tipo: string; estado: string; monto_moneda_origen: number; moneda: string; orden_pago_numero?: string; fx_fecha?: string; fx_rate?: number; monto_clp?: number }>
  alertas?: Array<{ id: string; tipo: string; urgente: boolean; leida: boolean }>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ESTADO_LABELS: Record<string, string> = {
  INVOICE_RECIBIDO:    'Invoice',
  PAGO_PENDIENTE:      'Pago Pendiente',
  PAGO_PARCIAL:        'Pago Parcial',
  PAGO_COMPLETO:       'Pago Completo',
  EN_ADUANA:           'En Aduana',
  PROVISION_RECIBIDA:  'Provisión',
  MERCADERIA_RECIBIDA: 'Mercadería',
  RECONCILIADO:        'Reconciliado',
}

const ESTADO_BADGE: Record<string, 'neutral' | 'pending' | 'warning' | 'success' | 'purple' | 'info'> = {
  INVOICE_RECIBIDO:    'neutral',
  PAGO_PENDIENTE:      'pending',
  PAGO_PARCIAL:        'warning',
  PAGO_COMPLETO:       'success',
  EN_ADUANA:           'purple',
  PROVISION_RECIBIDA:  'info',
  MERCADERIA_RECIBIDA: 'info',
  RECONCILIADO:        'success',
}

const PIPELINE = ['INVOICE_RECIBIDO','PAGO_PENDIENTE','PAGO_PARCIAL','PAGO_COMPLETO','EN_ADUANA','PROVISION_RECIBIDA','MERCADERIA_RECIBIDA','RECONCILIADO']

const FILTER_GROUPS = [
  { label: 'Todas',       estados: null },
  { label: 'Por pagar',   estados: ['INVOICE_RECIBIDO','PAGO_PENDIENTE','PAGO_PARCIAL'] },
  { label: 'En tránsito', estados: ['PAGO_COMPLETO','EN_ADUANA'] },
  { label: 'En proceso',  estados: ['PROVISION_RECIBIDA','MERCADERIA_RECIBIDA'] },
  { label: 'Cerradas',    estados: ['RECONCILIADO'] },
]

const FLAG: Record<string, string> = { China: '🇨🇳', Japón: '🇯🇵', Japan: '🇯🇵' }

function fmtMonto(n: number, moneda: string) {
  if (moneda === 'JPY') return `¥${n.toLocaleString('ja-JP')}`
  const dec = moneda === 'CLP' ? 0 : 2
  return `${moneda} ${n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })}`
}

function PipelineBar({ estado }: { estado: string }) {
  const idx = PIPELINE.indexOf(estado)
  const pct = Math.round(((idx + 1) / PIPELINE.length) * 100)
  const color = pct === 100 ? '#059669' : '#4F46E5'
  return (
    <div className="w-16 space-y-1">
      <div className="h-1 rounded-full overflow-hidden" style={{ background: '#E7E5E4' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <p className="text-right text-[9px] mono" style={{ color: '#A3A3A3' }}>{pct}%</p>
    </div>
  )
}

// ── Side panel ────────────────────────────────────────────────────────────────

const PIPELINE_STEPS = [
  { key: 'INVOICE_RECIBIDO',    label: 'Invoice recibido' },
  { key: 'PAGO_PENDIENTE',      label: 'Instrucción de pago' },
  { key: 'PAGO_COMPLETO',       label: 'Pagos confirmados' },
  { key: 'EN_ADUANA',           label: 'En aduana' },
  { key: 'PROVISION_RECIBIDA',  label: 'Provisión AGENSA' },
  { key: 'MERCADERIA_RECIBIDA', label: 'Mercadería recibida' },
  { key: 'RECONCILIADO',        label: 'Reconciliado' },
]

const PAGO_ESTADO_COLOR: Record<string, { color: string; bg: string }> = {
  PENDIENTE:  { color: '#D97706', bg: '#FFFBEB' },
  EMITIDO:    { color: '#4F46E5', bg: '#EEF2FF' },
  CONFIRMADO: { color: '#059669', bg: '#ECFDF5' },
}

function SidePanel({ remesa, onClose }: { remesa: Remesa; onClose: () => void }) {
  const currentIdx = PIPELINE_STEPS.findIndex(s => s.key === remesa.estado)
  const hasUrgent  = remesa.alertas?.some(a => a.urgente && !a.leida)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 animate-fade-in"
        style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full z-40 overflow-y-auto animate-slide-right"
        style={{
          width: 420,
          background: '#FFFFFF',
          borderLeft: '1px solid #E7E5E4',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.08)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b sticky top-0 bg-white z-10" style={{ borderColor: '#E7E5E4' }}>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: remesa.proveedor?.pais ? '#A3A3A3' : '#A3A3A3' }}>
              {FLAG[remesa.proveedor?.pais ?? ''] ?? '🌐'} {remesa.proveedor?.nombre}
            </p>
            <h2 className="text-lg font-bold mono" style={{ color: '#0A0A0A' }}>{remesa.numero_invoice}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={ESTADO_BADGE[remesa.estado] ?? 'neutral'} size="md">
              {ESTADO_LABELS[remesa.estado] ?? remesa.estado}
            </Badge>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{ background: '#F5F5F4', color: '#A3A3A3' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Urgent banner */}
        {hasUrgent && (
          <div className="flex items-center gap-2 px-6 py-3" style={{ background: '#FEF2F2', borderBottom: '1px solid #FECACA' }}>
            <AlertTriangle size={14} style={{ color: '#DC2626', flexShrink: 0 }} />
            <p className="text-xs font-medium" style={{ color: '#DC2626' }}>Tiene alertas urgentes pendientes</p>
          </div>
        )}

        <div className="px-6 py-5 space-y-6">

          {/* Progress stepper */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: '#A3A3A3' }}>Pipeline</p>
            <div className="space-y-0">
              {PIPELINE_STEPS.map((step, idx) => {
                const done    = idx < currentIdx
                const current = idx === currentIdx
                return (
                  <div key={step.key} className="flex items-start gap-3">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                        style={
                          done    ? { background: '#4F46E5', color: '#FFF' }
                          : current ? { background: '#EEF2FF', color: '#4F46E5', border: '2px solid #4F46E5' }
                          : { background: '#F5F5F4', color: '#A3A3A3', border: '1px solid #E7E5E4' }
                        }
                      >
                        {done ? '✓' : idx + 1}
                      </div>
                      {idx < PIPELINE_STEPS.length - 1 && (
                        <div className="w-px flex-1 my-0.5" style={{ height: 16, background: done ? '#C7D2FE' : '#E7E5E4' }} />
                      )}
                    </div>
                    <p
                      className="text-xs pb-2 pt-0.5"
                      style={{
                        color: done ? '#4F46E5' : current ? '#0A0A0A' : '#A3A3A3',
                        fontWeight: current ? 600 : 400,
                      }}
                    >
                      {step.label}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Monto cards */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#A3A3A3' }}>Montos</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Total invoice', value: fmtMonto(remesa.monto_original, remesa.moneda_origen), accent: '#0A0A0A' },
                { label: 'Condición',     value: remesa.condicion_pago ?? '—',                         accent: '#525252' },
                { label: 'N° despacho',   value: remesa.numero_despacho ?? '—',                        accent: '#4F46E5' },
                { label: 'DIN',           value: remesa.din_numero ?? '—',                             accent: '#7C3AED' },
              ].map(item => (
                <div key={item.label} className="rounded-lg p-3" style={{ background: '#FAFAF9', border: '1px solid #E7E5E4' }}>
                  <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: '#A3A3A3' }}>{item.label}</p>
                  <p className="text-sm font-bold mono" style={{ color: item.accent }}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Payment schedule */}
          {remesa.pagos && remesa.pagos.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#A3A3A3' }}>Pagos</p>
              <div className="space-y-2">
                {remesa.pagos.map(pago => {
                  const s = PAGO_ESTADO_COLOR[pago.estado] ?? { color: '#525252', bg: '#F5F5F4' }
                  return (
                    <div key={pago.id} className="flex items-center gap-3 rounded-lg p-3" style={{ background: '#FAFAF9', border: '1px solid #E7E5E4' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold" style={{ color: '#0A0A0A' }}>
                          {pago.tipo} — {fmtMonto(pago.monto_moneda_origen, pago.moneda)}
                        </p>
                        {pago.orden_pago_numero && (
                          <p className="text-[10px] mono" style={{ color: '#A3A3A3' }}>OP: {pago.orden_pago_numero}</p>
                        )}
                      </div>
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: s.bg, color: s.color }}
                      >
                        {pago.estado}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Notas */}
          {remesa.notas && (
            <div className="rounded-lg p-3" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
              <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: '#D97706' }}>Notas</p>
              <p className="text-xs" style={{ color: '#525252' }}>{remesa.notas}</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RemesasPage() {
  const [remesas, setRemesas]       = useState<Remesa[]>([])
  const [loading, setLoading]       = useState(true)
  const [filter, setFilter]         = useState(0)
  const [selected, setSelected]     = useState<Remesa | null>(null)

  useEffect(() => {
    fetch('/api/remesas?limit=100')
      .then(r => r.json())
      .then(d => setRemesas(d.remesas ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const grupo    = FILTER_GROUPS[filter]
  const filtered = grupo.estados
    ? remesas.filter(r => grupo.estados!.includes(r.estado))
    : remesas

  const attention = remesas.filter(r => r.notas)

  return (
    <div className="p-8 min-h-screen animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] mb-1" style={{ color: '#4F46E5' }}>Importaciones</p>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#0A0A0A' }}>Remesas</h1>
          <p className="text-sm mt-1" style={{ color: '#A3A3A3' }}>
            {remesas.length} registradas · {remesas.filter(r => r.estado !== 'RECONCILIADO').length} activas
          </p>
        </div>
        <button className="btn-primary">
          <Plus size={16} />
          Nueva remesa
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-1.5 mb-6">
        {FILTER_GROUPS.map((g, idx) => {
          const count = g.estados
            ? remesas.filter(r => g.estados!.includes(r.estado)).length
            : remesas.length
          return (
            <button
              key={g.label}
              onClick={() => setFilter(idx)}
              className={clsx('pill', filter === idx && 'pill-active')}
            >
              {g.label}
              <span className="ml-1 opacity-60 text-[10px]">({count})</span>
            </button>
          )
        })}
      </div>

      {/* Attention banner */}
      {attention.length > 0 && (
        <div
          className="flex gap-3 rounded-xl px-4 py-3 mb-4"
          style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
        >
          <AlertTriangle size={16} style={{ color: '#D97706', flexShrink: 0, marginTop: 1 }} />
          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: '#D97706' }}>Atención requerida</p>
            {attention.map(r => (
              <p key={r.id} className="text-xs" style={{ color: '#525252' }}>
                <span className="mono font-semibold" style={{ color: '#B45309' }}>{r.numero_invoice}</span>
                {' '}— {r.notas}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-10 rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<span style={{ fontSize: 22 }}>📦</span>}
            title="Sin remesas en esta categoría"
            description="Las remesas aparecerán aquí cuando los agentes procesen los emails de invoice."
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: '#E7E5E4', background: '#FAFAF9' }}>
                <th className="th">Invoice</th>
                <th className="th">Proveedor</th>
                <th className="th text-right">Monto</th>
                <th className="th">Condición</th>
                <th className="th">Estado</th>
                <th className="th">Pipeline</th>
                <th className="th">Despacho</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const isUrgent = r.alertas?.some(a => a.urgente && !a.leida)
                return (
                  <tr
                    key={r.id}
                    className="table-row cursor-pointer"
                    onClick={() => setSelected(r)}
                    style={isUrgent ? { borderLeft: '2px solid #DC2626', background: 'rgba(254,242,242,0.3)' } : {}}
                  >
                    <td className="td">
                      <span className="mono font-semibold text-xs" style={{ color: '#4F46E5' }}>
                        {r.numero_invoice}
                      </span>
                    </td>
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <span>{FLAG[r.proveedor?.pais ?? ''] ?? '🌐'}</span>
                        <div>
                          <p className="text-xs font-semibold leading-tight" style={{ color: '#0A0A0A' }}>
                            {r.proveedor?.nombre.split(' ')[0] ?? '—'}
                          </p>
                          <p className="text-[10px]" style={{ color: '#A3A3A3' }}>{r.proveedor?.pais}</p>
                        </div>
                      </div>
                    </td>
                    <td className="td text-right">
                      <span className="mono font-bold text-sm" style={{ color: '#0A0A0A' }}>
                        {fmtMonto(r.monto_original, r.moneda_origen)}
                      </span>
                    </td>
                    <td className="td">
                      <span className="mono text-xs px-2 py-0.5 rounded-md" style={{ background: '#F5F5F4', color: '#525252', border: '1px solid #E7E5E4' }}>
                        {r.condicion_pago ?? '—'}
                      </span>
                    </td>
                    <td className="td">
                      <Badge variant={ESTADO_BADGE[r.estado] ?? 'neutral'} size="sm">
                        {ESTADO_LABELS[r.estado] ?? r.estado}
                      </Badge>
                    </td>
                    <td className="td">
                      <PipelineBar estado={r.estado} />
                    </td>
                    <td className="td">
                      <span className="mono text-xs" style={{ color: '#A3A3A3' }}>
                        {r.numero_despacho ?? '—'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Side panel */}
      {selected && <SidePanel remesa={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
