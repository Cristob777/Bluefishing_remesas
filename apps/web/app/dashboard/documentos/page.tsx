'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { EmptyState } from '@/components/ui/EmptyState'
import { KpiCard, PageHeader } from '@/components/dashboard/Kit'
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  FileSearch,
  FileText,
  Inbox,
  Search,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react'

interface Documento {
  id: string
  remesa_id?: string | null
  tipo: string
  numero: string | null
  archivo_url: string | null
  monto: number | null
  moneda: string | null
  fecha: string | null
  agente_nombre: string | null
  confianza: number | null
  campos_extraidos: Record<string, unknown> | null
  google_document_ai_id: string | null
  google_document_ai_revision_id: string | null
  google_document_ai_processor: string | null
  google_document_ai_gcs_uri: string | null
  created_at: string
  remesa?: {
    numero_invoice: string
    proveedor?: { nombre: string } | null
  } | null
}

type ConfidenceFilter = 'all' | 'review' | 'auto'

const REVIEW_THRESHOLD = 82

const TIPOS = ['INVOICE', 'DIN', 'FACTURA_AGENSA', 'PROVISION', 'NOTA_DEBITO', 'NOTA_CREDITO']

const TIPO_STYLE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  INVOICE:        { label: 'Invoice',       color: '#2A6CF0', bg: '#EEF4FF', border: '#BED2FF' },
  DIN:            { label: 'DIN',           color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  FACTURA_AGENSA: { label: 'Fact. Agensa',  color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  PROVISION:      { label: 'Provisión',     color: '#C2410C', bg: '#FFF7ED', border: '#FED7AA' },
  NOTA_DEBITO:    { label: 'Nota débito',   color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  NOTA_CREDITO:   { label: 'Nota crédito',  color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  OTRO:           { label: 'Otro',          color: '#525252', bg: '#F5F5F4', border: '#E7E5E4' },
}

function typeStyle(tipo: string) {
  return TIPO_STYLE[tipo] ?? TIPO_STYLE.OTRO
}

function confidencePercent(raw: number | null | undefined) {
  if (raw == null || Number.isNaN(raw)) return null
  const pct = raw <= 1 ? raw * 100 : raw
  return Math.max(0, Math.min(100, Math.round(pct)))
}

function confidenceTone(pct: number) {
  if (pct >= 85) return { color: '#059669', bg: '#ECFDF5', label: 'Alta' }
  if (pct >= 70) return { color: '#D97706', bg: '#FFFBEB', label: 'Media' }
  return { color: '#DC2626', bg: '#FEF2F2', label: 'Revisión' }
}

function fmtMonto(n: number, moneda: string) {
  if (moneda === 'JPY') return `JPY ${n.toLocaleString('ja-JP')}`
  if (moneda === 'CLP') {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(n)
  }
  return `${moneda} ${n.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return 'Sin fecha'
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const min  = Math.floor(diff / 60000)
  if (min < 1)  return 'ahora'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  return `hace ${Math.floor(h / 24)} d`
}

function fieldEntries(doc: Documento | null) {
  if (!doc?.campos_extraidos) return []
  return Object.entries(doc.campos_extraidos)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .slice(0, 12)
}

function formatFieldValue(value: unknown) {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function suggestionFor(doc: Documento) {
  const pct = confidencePercent(doc.confianza)
  if (pct != null && pct < REVIEW_THRESHOLD) {
    return {
      title: 'Validar extracción',
      detail: 'La confianza está bajo el umbral. Revisa proveedor, monto y número antes de avanzar.',
      Icon: TriangleAlert,
    }
  }

  if (doc.tipo === 'DIN') {
    return {
      title: 'Reconciliar DIN',
      detail: 'Comparar total DIN contra provisión y cerrar remesa si queda dentro de tolerancia.',
      Icon: ShieldCheck,
    }
  }

  if (doc.tipo === 'FACTURA_AGENSA' || doc.tipo === 'PROVISION') {
    return {
      title: 'Vincular despacho',
      detail: 'Asociar el respaldo de Agensa al despacho y dejar evidencia para conciliación.',
      Icon: ClipboardCheck,
    }
  }

  if (doc.tipo === 'NOTA_DEBITO' || doc.tipo === 'NOTA_CREDITO') {
    return {
      title: 'Revisar excedente Agensa',
      detail: 'Determinar si corresponde nota de débito o crédito hacia Bluefishing y dejar trazabilidad.',
      Icon: FileSearch,
    }
  }

  return {
    title: 'Crear o actualizar remesa',
    detail: 'Usar los campos extraídos para confirmar supplier, invoice, monto y condiciones de pago.',
    Icon: ArrowRight,
  }
}

export default function DocumentosPage() {
  const [docs, setDocs] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [tipoFilter, setTipoFilter] = useState<string | null>(null)
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Documento | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const qs = tipoFilter ? `?tipo=${tipoFilter}` : ''

    fetch(`/api/documents${qs}`)
      .then(r => r.json())
      .then(d => {
        if (!cancelled) setDocs(d.data ?? [])
      })
      .catch(() => {
        if (!cancelled) setDocs([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [tipoFilter])

  const visibleDocs = useMemo(() => {
    const q = query.trim().toLowerCase()

    return docs.filter(doc => {
      const pct = confidencePercent(doc.confianza)
      const matchesConfidence =
        confidenceFilter === 'all' ||
        (confidenceFilter === 'review' && (pct == null || pct < REVIEW_THRESHOLD)) ||
        (confidenceFilter === 'auto' && pct != null && pct >= REVIEW_THRESHOLD)

      if (!matchesConfidence) return false
      if (!q) return true

      return [
        doc.tipo,
        doc.numero,
        doc.remesa?.numero_invoice,
        doc.remesa?.proveedor?.nombre,
        doc.google_document_ai_id,
        doc.agente_nombre,
      ]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(q))
    })
  }, [confidenceFilter, docs, query])

  useEffect(() => {
    if (loading) return
    if (!visibleDocs.length) {
      if (selected) setSelected(null)
      return
    }
    if (!selected || !visibleDocs.some(doc => doc.id === selected.id)) {
      setSelected(visibleDocs[0])
    }
  }, [loading, selected?.id, visibleDocs])

  const reviewCount = docs.filter(doc => {
    const pct = confidencePercent(doc.confianza)
    return pct == null || pct < REVIEW_THRESHOLD
  }).length
  const autoCount = docs.filter(doc => {
    const pct = confidencePercent(doc.confianza)
    return pct != null && pct >= REVIEW_THRESHOLD
  }).length
  const docAiCount = docs.filter(doc => doc.google_document_ai_id).length

  const selectedFields = fieldEntries(selected)

  return (
    <div className="dashboard-page--wide min-h-full">
      <PageHeader
        title="Documentos"
        subtitle="Bandeja de documentos procesados por agentes, con evidencia de extracción y trazabilidad Document AI."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard label="Procesados" value={docs.length} />
        <KpiCard label="Revisión" value={reviewCount} tone={reviewCount > 0 ? 'warning' : 'success'} />
        <KpiCard label="Document AI" value={docAiCount} />
      </div>

      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <FilterButton active={tipoFilter === null} onClick={() => setTipoFilter(null)}>
            Todos
          </FilterButton>
          {TIPOS.map(tipo => {
            const style = typeStyle(tipo)
            const active = tipoFilter === tipo
            return (
              <button
                key={tipo}
                type="button"
                onClick={() => setTipoFilter(active ? null : tipo)}
                className="rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-150"
                style={{
                  background: active ? style.color : style.bg,
                  borderColor: active ? style.color : style.border,
                  color: active ? '#FFFFFF' : style.color,
                }}
              >
                {style.label}
              </button>
            )
          })}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex rounded-lg border bg-white p-0.5" style={{ borderColor: 'var(--border-default)' }}>
            {[
              { key: 'all', label: 'Todos', count: docs.length },
              { key: 'review', label: 'Revisión', count: reviewCount },
              { key: 'auto', label: 'Auto-OK', count: autoCount },
            ].map(item => (
              <button
                key={item.key}
                type="button"
                onClick={() => setConfidenceFilter(item.key as ConfidenceFilter)}
                className="rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150"
                style={{
                  background: confidenceFilter === item.key ? 'var(--fg-1)' : 'transparent',
                  color: confidenceFilter === item.key ? '#FFFFFF' : 'var(--fg-3)',
                }}
              >
                {item.label} <span className="mono opacity-70">{item.count}</span>
              </button>
            ))}
          </div>

          <label
            className="flex min-w-[240px] items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm"
            style={{ borderColor: 'var(--border-default)', color: 'var(--fg-3)' }}
          >
            <Search size={14} strokeWidth={1.75} />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Buscar documento..."
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              style={{ color: 'var(--fg-1)' }}
            />
          </label>
        </div>
      </div>

      <div className="grid min-h-[620px] gap-4 xl:grid-cols-[minmax(380px,0.95fr)_minmax(520px,1.35fr)]">
        <section className="card min-w-0 overflow-hidden p-0">
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center gap-2">
              <Inbox size={16} strokeWidth={1.75} style={{ color: 'var(--fg-3)' }} />
              <h2 className="text-sm font-semibold" style={{ color: 'var(--fg-1)' }}>Bandeja de extracción</h2>
            </div>
            <span className="mono text-xs" style={{ color: 'var(--fg-4)' }}>{visibleDocs.length} visibles</span>
          </div>

          {loading ? (
            <DocumentListSkeleton />
          ) : visibleDocs.length === 0 ? (
            <EmptyState
              icon={<FileText size={20} style={{ color: 'var(--fg-4)' }} />}
              title="Sin documentos para este filtro"
              description="Cuando los agentes procesen invoices, DIN o respaldos de Agensa, aparecerán en esta bandeja."
            />
          ) : (
            <div className="divide-y overflow-y-auto" style={{ maxHeight: 720, borderColor: 'var(--border-subtle)' }}>
              {visibleDocs.map(doc => (
                <DocumentRow
                  key={doc.id}
                  doc={doc}
                  active={selected?.id === doc.id}
                  onClick={() => setSelected(doc)}
                />
              ))}
            </div>
          )}
        </section>

        <DocumentDetail doc={selected} fields={selectedFields} />
      </div>
    </div>
  )
}

function SummaryMetric({ label, value, tone }: { label: string; value: number; tone?: 'warn' | 'agent' }) {
  const color = tone === 'warn' ? 'var(--warning)' : tone === 'agent' ? 'var(--agent)' : 'var(--accent)'
  const bg = tone === 'warn' ? 'var(--warning-bg)' : tone === 'agent' ? 'var(--agent-bg)' : 'var(--accent-bg)'

  return (
    <div className="rounded-lg border bg-white px-3 py-2" style={{ borderColor: 'var(--border-default)' }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--fg-4)' }}>{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <span className="mono text-lg font-semibold" style={{ color: 'var(--fg-1)' }}>{value}</span>
        <span className="h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 0 4px ${bg}` }} />
      </div>
    </div>
  )
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-150"
      style={{
        background: active ? 'var(--fg-1)' : 'var(--bg-surface)',
        borderColor: active ? 'var(--fg-1)' : 'var(--border-default)',
        color: active ? '#FFFFFF' : 'var(--fg-2)',
      }}
    >
      {children}
    </button>
  )
}

function DocumentListSkeleton() {
  return (
    <div className="space-y-0 p-3">
      {[0, 1, 2, 3, 4, 5].map(i => (
        <div key={i} className="border-b px-1 py-4" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="mb-3 flex items-center gap-3">
            <div className="skeleton h-5 w-20" />
            <div className="skeleton h-4 w-32" />
            <div className="ml-auto skeleton h-4 w-14" />
          </div>
          <div className="skeleton h-3 w-3/4" />
        </div>
      ))}
    </div>
  )
}

function DocumentRow({ doc, active, onClick }: { doc: Documento; active: boolean; onClick: () => void }) {
  const style = typeStyle(doc.tipo)
  const pct = confidencePercent(doc.confianza)
  const tone = pct == null ? null : confidenceTone(pct)

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full px-4 py-3 text-left transition-all duration-150"
      style={{
        background: active ? 'var(--bg-selected)' : 'var(--bg-surface)',
        boxShadow: active ? 'inset 3px 0 0 var(--agent)' : 'none',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="pill-status" style={{ background: style.bg, borderColor: style.border, color: style.color }}>
              {style.label}
            </span>
            {doc.google_document_ai_id && (
              <span className="pill-status" style={{ background: 'var(--agent-bg)', borderColor: 'var(--agent-border)', color: 'var(--agent-text)' }}>
                <Bot size={11} strokeWidth={1.75} />
                DocAI
              </span>
            )}
            {pct != null && tone && (
              <span className="pill-status" style={{ background: tone.bg, borderColor: tone.bg, color: tone.color }}>
                {tone.label} <span className="mono">{pct}%</span>
              </span>
            )}
          </div>
          <p className="truncate text-sm font-semibold" style={{ color: 'var(--fg-1)' }}>
            {doc.numero ?? doc.remesa?.numero_invoice ?? doc.id.slice(0, 8)}
          </p>
          <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--fg-4)' }}>
            {doc.remesa?.proveedor?.nombre ?? doc.agente_nombre ?? 'Sin proveedor asociado'}
          </p>
        </div>

        <div className="shrink-0 text-right">
          {doc.monto != null && doc.moneda ? (
            <p className="mono text-xs font-semibold" style={{ color: 'var(--fg-1)' }}>
              {fmtMonto(doc.monto, doc.moneda)}
            </p>
          ) : (
            <p className="text-xs" style={{ color: 'var(--fg-4)' }}>Sin monto</p>
          )}
          <p className="mt-1 mono text-[10px]" style={{ color: 'var(--fg-4)' }}>{relTime(doc.created_at)}</p>
        </div>
      </div>
    </button>
  )
}

function DocumentDetail({ doc, fields }: { doc: Documento | null; fields: [string, unknown][] }) {
  if (!doc) {
    return (
      <section className="card flex min-h-[420px] items-center justify-center">
        <EmptyState
          icon={<FileSearch size={20} style={{ color: 'var(--fg-4)' }} />}
          title="Selecciona un documento"
          description="La vista de detalle mostrará extracción, evidencia, confianza y acción sugerida."
        />
      </section>
    )
  }

  const style = typeStyle(doc.tipo)
  const pct = confidencePercent(doc.confianza)
  const tone = pct == null ? null : confidenceTone(pct)
  const suggestion = suggestionFor(doc)
  const SuggestionIcon = suggestion.Icon

  return (
    <section className="card min-w-0 overflow-hidden p-0">
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="pill-status" style={{ background: style.bg, borderColor: style.border, color: style.color }}>
              {style.label}
            </span>
            {doc.google_document_ai_id && (
              <span className="pill-status" style={{ background: 'var(--agent-bg)', borderColor: 'var(--agent-border)', color: 'var(--agent-text)' }}>
                <Bot size={11} strokeWidth={1.75} />
                Google Document AI
              </span>
            )}
          </div>
          <h2 className="truncate text-xl font-semibold tracking-tight" style={{ color: 'var(--fg-1)' }}>
            {doc.numero ?? 'Documento sin número'}
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--fg-4)' }}>
            {doc.remesa?.proveedor?.nombre ?? 'Proveedor no asociado'} · {fmtDate(doc.fecha ?? doc.created_at)}
          </p>
        </div>

        {doc.archivo_url && (
          <a
            href={doc.archivo_url}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary shrink-0 px-3 py-1.5 text-xs"
          >
            <ExternalLink size={13} strokeWidth={1.75} />
            Abrir
          </a>
        )}
      </div>

      <div className="grid gap-0 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0 p-5">
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <DetailMetric label="Monto" value={doc.monto != null && doc.moneda ? fmtMonto(doc.monto, doc.moneda) : 'Sin monto'} />
            <DetailMetric label="Remesa" value={doc.remesa?.numero_invoice ?? 'Sin remesa'} />
            <DetailMetric label="Agente" value={doc.agente_nombre ?? 'Sin agente'} agent />
          </div>

          <div className="agent-strip mb-5">
            <SuggestionIcon size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold">{suggestion.title}</p>
              <p className="mt-0.5 leading-relaxed opacity-80">{suggestion.detail}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border" style={{ borderColor: 'var(--border-default)' }}>
            <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-subtle)' }}>
              <div className="flex items-center gap-2">
                <FileText size={15} strokeWidth={1.75} style={{ color: 'var(--fg-3)' }} />
                <h3 className="text-sm font-semibold" style={{ color: 'var(--fg-1)' }}>Campos extraídos</h3>
              </div>
              <span className="mono text-xs" style={{ color: 'var(--fg-4)' }}>{fields.length}</span>
            </div>

            {fields.length === 0 ? (
              <p className="px-4 py-6 text-sm" style={{ color: 'var(--fg-4)' }}>Sin campos extraídos para este documento.</p>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {fields.map(([key, value]) => (
                  <div key={key} className="grid gap-1 px-4 py-3 sm:grid-cols-[170px_1fr] sm:gap-4">
                    <p className="mono text-[11px] font-semibold" style={{ color: 'var(--fg-4)' }}>{key}</p>
                    <p className="mono min-w-0 break-words text-xs" style={{ color: 'var(--fg-1)' }}>
                      {formatFieldValue(value)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {doc.remesa_id ? (
              <Link href={`/dashboard/remesas?focus=${doc.remesa_id}`} className="btn-primary px-3 py-2 text-xs">
                Abrir remesa
                <ArrowRight size={13} strokeWidth={1.75} />
              </Link>
            ) : (
              <button type="button" disabled className="btn-secondary px-3 py-2 text-xs opacity-60">
                Remesa no vinculada
              </button>
            )}
            <button type="button" disabled className="btn-secondary px-3 py-2 text-xs opacity-60" title="Disponible cuando exista acción pendiente">
              Aplicar sugerencia
            </button>
          </div>
        </div>

        <aside className="border-t p-5 lg:border-l lg:border-t-0" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-subtle)' }}>
          <div className="mb-5 rounded-lg border bg-white p-4" style={{ borderColor: 'var(--border-default)' }}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--fg-4)' }}>Confianza</p>
              {tone && (
                <span className="pill-status" style={{ background: tone.bg, borderColor: tone.bg, color: tone.color }}>
                  {tone.label}
                </span>
              )}
            </div>
            {pct == null ? (
              <p className="text-sm" style={{ color: 'var(--fg-4)' }}>Sin score</p>
            ) : (
              <ConfidenceMeter pct={pct} />
            )}
          </div>

          <div className="rounded-lg border bg-white p-4" style={{ borderColor: 'var(--border-default)' }}>
            <div className="mb-3 flex items-center gap-2">
              <Bot size={15} strokeWidth={1.75} style={{ color: 'var(--agent)' }} />
              <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--fg-4)' }}>
                Document AI
              </p>
            </div>
            <div className="space-y-3">
              <MetaRow label="Document ID" value={doc.google_document_ai_id} />
              <MetaRow label="Revision" value={doc.google_document_ai_revision_id} />
              <MetaRow label="Processor" value={doc.google_document_ai_processor} />
              <MetaRow label="GCS URI" value={doc.google_document_ai_gcs_uri} />
            </div>
          </div>

          <div className="mt-5 rounded-lg border bg-white p-4" style={{ borderColor: 'var(--border-default)' }}>
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 size={15} strokeWidth={1.75} style={{ color: 'var(--success)' }} />
              <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--fg-4)' }}>
                Auditoría
              </p>
            </div>
            <MetaRow label="Creado" value={fmtDate(doc.created_at)} />
            <div className="mt-3">
              <MetaRow label="ID interno" value={doc.id} />
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}

function DetailMetric({ label, value, agent }: { label: string; value: string; agent?: boolean }) {
  return (
    <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: 'var(--border-default)', background: agent ? 'var(--agent-bg)' : 'var(--bg-subtle)' }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: agent ? 'var(--agent-text)' : 'var(--fg-4)' }}>
        {label}
      </p>
      <p className="mono mt-1 truncate text-xs font-semibold" style={{ color: 'var(--fg-1)' }}>{value}</p>
    </div>
  )
}

function ConfidenceMeter({ pct }: { pct: number }) {
  const tone = confidenceTone(pct)
  return (
    <div>
      <div className="confidence">
        <div className="confidence-track flex-1">
          <div className="confidence-fill" style={{ width: `${pct}%`, background: tone.color }} />
        </div>
        <span className="mono text-sm font-bold" style={{ color: tone.color }}>{pct}%</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--fg-4)' }}>
        La confianza se usa como señal operativa. Bajo {REVIEW_THRESHOLD}% queda marcado para revisión humana.
      </p>
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--fg-4)' }}>
        {label}
      </span>
      <span className="mono break-words text-xs" style={{ color: value ? 'var(--fg-1)' : 'var(--fg-4)' }}>
        {value || 'No disponible'}
      </span>
    </div>
  )
}
