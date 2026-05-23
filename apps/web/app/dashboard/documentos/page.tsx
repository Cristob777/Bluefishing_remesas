'use client'

import { useState, useEffect } from 'react'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { FileText } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Documento {
  id: string
  tipo: string
  numero: string | null
  archivo_url: string | null
  monto: number | null
  moneda: string | null
  fecha: string | null
  agente_nombre: string | null
  confianza: number | null
  campos_extraidos: Record<string, unknown> | null
  created_at: string
  remesa?: {
    numero_invoice: string
    proveedor?: { nombre: string } | null
  } | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TIPOS = ['INVOICE', 'DIN', 'FACTURA_AGENSA', 'PROVISION', 'NOTA_DEBITO', 'NOTA_CREDITO']

const TIPO_STYLE: Record<string, { color: string; bg: string }> = {
  INVOICE:        { color: '#4F46E5', bg: '#EEF2FF' },
  DIN:            { color: '#7C3AED', bg: '#F5F3FF' },
  FACTURA_AGENSA: { color: '#D97706', bg: '#FFFBEB' },
  PROVISION:      { color: '#DC2626', bg: '#FEF2F2' },
  NOTA_DEBITO:    { color: '#C2410C', bg: '#FFF7ED' },
  NOTA_CREDITO:   { color: '#059669', bg: '#ECFDF5' },
  OTRO:           { color: '#525252', bg: '#F5F5F4' },
}

const TIPO_LABELS: Record<string, string> = {
  INVOICE:        'Invoice',
  DIN:            'DIN',
  FACTURA_AGENSA: 'Fact. Agensa',
  PROVISION:      'Provisión',
  NOTA_DEBITO:    'Nota Débito',
  NOTA_CREDITO:   'Nota Crédito',
  OTRO:           'Otro',
}

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

// ── Confidence bar ─────────────────────────────────────────────────────────────

function ConfidenceBar({ value }: { value: number }) {
  const pct   = Math.round(value * 100)
  const color = pct >= 85 ? '#059669' : pct >= 60 ? '#D97706' : '#DC2626'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#E7E5E4', maxWidth: 80 }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[11px] font-bold mono" style={{ color }}>{pct}%</span>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DocumentosPage() {
  const [docs, setDocs]         = useState<Documento[]>([])
  const [loading, setLoading]   = useState(true)
  const [tipoFilter, setTipoFilter] = useState<string | null>(null)
  const [selected, setSelected] = useState<Documento | null>(null)

  useEffect(() => {
    setLoading(true)
    const qs = tipoFilter ? `?tipo=${tipoFilter}` : ''
    fetch(`/api/documents${qs}`)
      .then(r => r.json())
      .then(d => setDocs(d.data ?? []))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false))
  }, [tipoFilter])

  // When filter changes, clear selection if it no longer matches
  useEffect(() => {
    if (selected && tipoFilter && selected.tipo !== tipoFilter) {
      setSelected(null)
    }
  }, [tipoFilter, selected])

  const campos = selected?.campos_extraidos
    ? Object.entries(selected.campos_extraidos).filter(([, v]) => v !== null && v !== undefined)
    : []

  return (
    <div className="p-8 min-h-screen" style={{ background: '#FAFAF9' }}>

      {/* Header */}
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] mb-1" style={{ color: '#4F46E5' }}>Archivo</p>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#0A0A0A' }}>Documentos</h1>
        <p className="text-sm mt-1" style={{ color: '#A3A3A3' }}>
          Documentos procesados por los agentes · campos extraídos con IA
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <button
          onClick={() => setTipoFilter(null)}
          className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-colors"
          style={{
            background: tipoFilter === null ? '#0A0A0A' : '#F5F5F4',
            color: tipoFilter === null ? '#FFF' : '#525252',
          }}
        >
          Todos
        </button>
        {TIPOS.map(tipo => {
          const s = TIPO_STYLE[tipo] ?? TIPO_STYLE.OTRO
          const active = tipoFilter === tipo
          return (
            <button
              key={tipo}
              onClick={() => setTipoFilter(active ? null : tipo)}
              className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all"
              style={{
                background: active ? s.color : s.bg,
                color: active ? '#FFF' : s.color,
              }}
            >
              {TIPO_LABELS[tipo] ?? tipo}
            </button>
          )
        })}
      </div>

      {/* Two-panel layout */}
      <div className="flex gap-5" style={{ minHeight: 500 }}>

        {/* Left: document list */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="space-y-2">
              {[0,1,2,3,4].map(i => (
                <div key={i} className="bg-white rounded-xl border p-4" style={{ borderColor: '#E7E5E4' }}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-4 w-16 rounded animate-pulse" style={{ background: '#F5F5F4' }} />
                    <div className="h-4 w-32 rounded animate-pulse" style={{ background: '#F5F5F4' }} />
                  </div>
                  <div className="h-3 w-48 rounded animate-pulse" style={{ background: '#F5F5F4' }} />
                </div>
              ))}
            </div>
          ) : !docs.length ? (
            <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#E7E5E4' }}>
              <EmptyState
                icon={<FileText size={20} style={{ color: '#A3A3A3' }} />}
                title="Sin documentos procesados"
                description="Los agentes archivarán aquí los documentos de remesas cuando los procesen."
              />
            </div>
          ) : (
            <div className="space-y-2">
              {docs.map(doc => {
                const s      = TIPO_STYLE[doc.tipo] ?? TIPO_STYLE.OTRO
                const active = selected?.id === doc.id
                return (
                  <button
                    key={doc.id}
                    onClick={() => setSelected(active ? null : doc)}
                    className="w-full bg-white rounded-xl border p-4 text-left transition-all"
                    style={{
                      borderColor: active ? s.color : '#E7E5E4',
                      boxShadow: active ? `0 0 0 1px ${s.color}33` : '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: s.bg, color: s.color }}
                        >
                          {TIPO_LABELS[doc.tipo] ?? doc.tipo}
                        </span>
                        <span className="text-[13px] font-semibold truncate" style={{ color: '#0A0A0A' }}>
                          {doc.numero ?? doc.id.slice(0, 8)}
                        </span>
                        {doc.remesa?.proveedor?.nombre && (
                          <span className="text-[11px] truncate hidden sm:block" style={{ color: '#A3A3A3' }}>
                            · {doc.remesa.proveedor.nombre}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {doc.monto != null && doc.moneda && (
                          <span className="text-[12px] font-semibold mono" style={{ color: '#0A0A0A' }}>
                            {fmtMonto(doc.monto, doc.moneda)}
                          </span>
                        )}
                        <span className="text-[10px] mono" style={{ color: '#A3A3A3' }}>
                          {relTime(doc.created_at)}
                        </span>
                      </div>
                    </div>

                    {doc.confianza != null && (
                      <div className="mt-2.5">
                        <ConfidenceBar value={doc.confianza} />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Right: detail panel */}
        {selected && (
          <div
            className="w-80 flex-shrink-0 bg-white rounded-xl border overflow-hidden self-start sticky top-6"
            style={{ borderColor: '#E7E5E4' }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b" style={{ borderColor: '#E7E5E4' }}>
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: TIPO_STYLE[selected.tipo]?.bg, color: TIPO_STYLE[selected.tipo]?.color }}
                >
                  {TIPO_LABELS[selected.tipo] ?? selected.tipo}
                </span>
                <span className="text-[12px] font-semibold mono" style={{ color: '#0A0A0A' }}>
                  {selected.numero ?? '—'}
                </span>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-sm font-bold transition-colors"
                style={{ color: '#A3A3A3' }}
              >
                ×
              </button>
            </div>

            {/* Confidence */}
            {selected.confianza != null && (
              <div className="px-4 py-3 border-b" style={{ borderColor: '#E7E5E4', background: '#FAFAF9' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#A3A3A3' }}>Confianza IA</p>
                <ConfidenceBar value={selected.confianza} />
              </div>
            )}

            {/* Extracted fields */}
            <div className="px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#A3A3A3' }}>
                Campos extraídos
              </p>
              {campos.length === 0 ? (
                <p className="text-[12px]" style={{ color: '#A3A3A3' }}>Sin campos extraídos</p>
              ) : (
                <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #E7E5E4' }}>
                  {campos.map(([k, v], i) => (
                    <div
                      key={k}
                      className="px-3 py-2"
                      style={{
                        borderBottom: i < campos.length - 1 ? '1px solid #F5F5F4' : 'none',
                        background: i % 2 === 0 ? '#FAFAF9' : '#FFF',
                      }}
                    >
                      <p className="text-[10px] font-semibold mono mb-0.5" style={{ color: '#A3A3A3' }}>{k}</p>
                      <p className="text-[11px] mono break-all" style={{ color: '#0A0A0A' }}>
                        {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="px-4 pb-3 space-y-1.5">
              {selected.remesa?.numero_invoice && (
                <div className="flex justify-between text-[11px]">
                  <span style={{ color: '#A3A3A3' }}>Invoice</span>
                  <span className="font-semibold mono" style={{ color: '#0A0A0A' }}>{selected.remesa.numero_invoice}</span>
                </div>
              )}
              {selected.fecha && (
                <div className="flex justify-between text-[11px]">
                  <span style={{ color: '#A3A3A3' }}>Fecha doc.</span>
                  <span className="mono" style={{ color: '#0A0A0A' }}>
                    {new Date(selected.fecha).toLocaleDateString('es-CL')}
                  </span>
                </div>
              )}
              {selected.agente_nombre && (
                <div className="flex justify-between text-[11px]">
                  <span style={{ color: '#A3A3A3' }}>Procesado por</span>
                  <span className="mono" style={{ color: '#0A0A0A' }}>{selected.agente_nombre}</span>
                </div>
              )}
            </div>

            {/* Action button (placeholder) */}
            <div className="px-4 pb-4">
              <button
                disabled
                className="w-full py-2 rounded-lg text-[12px] font-semibold text-center"
                style={{ background: '#F5F5F4', color: '#A3A3A3', cursor: 'not-allowed' }}
                title="Próximamente"
              >
                Aplicar sugerencia
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
