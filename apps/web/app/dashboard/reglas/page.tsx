'use client'

import { useState, useEffect } from 'react'
import { EmptyState } from '@/components/ui/EmptyState'
import { GitBranch, Plus, X } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Condicion {
  campo: string
  operador: string
  valor: string
}

interface Regla {
  id: string
  nombre: string
  descripcion: string | null
  activa: boolean
  condiciones: Condicion[]
  accion: { tipo: string; parametros?: Record<string, unknown> }
  veces_ejecutada: number
  ultima_ejecucion: string | null
  creado_por: string | null
  created_at: string
}

// ── Options for form dropdowns ─────────────────────────────────────────────────

const CAMPOS = [
  { value: 'remesa.estado',          label: 'Shipment status' },
  { value: 'remesa.moneda_origen',   label: 'Origin currency' },
  { value: 'remesa.monto_original',  label: 'Original amount' },
  { value: 'provision.urgente',      label: 'Urgent provision' },
  { value: 'pago.tipo',              label: 'Payment type' },
]

const OPERADORES = [
  { value: 'eq',  label: 'equals' },
  { value: 'neq', label: 'not equals' },
  { value: 'gt',  label: 'greater than' },
  { value: 'lt',  label: 'less than' },
  { value: 'contains', label: 'contains' },
]

const ACCIONES = [
  { value: 'ENVIAR_ALERTA',       label: 'Send alert' },
  { value: 'NOTIFICAR_HECTOR',    label: 'Notify finance manager' },
  { value: 'NOTIFICAR_SEBASTIAN', label: 'Notify operations owner' },
  { value: 'CREAR_TAREA',         label: 'Create pending task' },
  { value: 'MARCAR_URGENTE',      label: 'Mark as urgent' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const min  = Math.floor(diff / 60000)
  if (min < 1)  return 'just now'
  if (min < 60) return `${min}m ago`
  const h = Math.floor(min / 60)
  if (h < 24)   return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const campoLabel = (v: string) => CAMPOS.find(c => c.value === v)?.label ?? v
const opLabel    = (v: string) => OPERADORES.find(o => o.value === v)?.label ?? v
const accionLabel = (v: string) => ACCIONES.find(a => a.value === v)?.label ?? v

// ── Empty condicion ────────────────────────────────────────────────────────────

function emptyCondicion(): Condicion {
  return { campo: CAMPOS[0].value, operador: 'eq', valor: '' }
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ReglasPage() {
  const [reglas, setReglas]     = useState<Regla[]>([])
  const [loading, setLoading]   = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Form state
  const [nombre, setNombre]           = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [condiciones, setCondiciones] = useState<Condicion[]>([emptyCondicion()])
  const [accionTipo, setAccionTipo]   = useState(ACCIONES[0].value)
  const [saving, setSaving]           = useState(false)
  const [formError, setFormError]     = useState<string | null>(null)

  function resetForm() {
    setNombre('')
    setDescripcion('')
    setCondiciones([emptyCondicion()])
    setAccionTipo(ACCIONES[0].value)
    setFormError(null)
  }

  function openDrawer() { resetForm(); setDrawerOpen(true) }
  function closeDrawer() { setDrawerOpen(false) }

  async function loadReglas() {
    setLoading(true)
    try {
      const r = await fetch('/api/rules')
      const d = await r.json()
      setReglas(d.data ?? [])
    } catch {
      setReglas([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadReglas() }, [])

  async function toggleActiva(regla: Regla) {
    setReglas(prev => prev.map(r => r.id === regla.id ? { ...r, activa: !r.activa } : r))
    await fetch(`/api/rules?id=${regla.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activa: !regla.activa }),
    })
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) { setFormError('Rule name is required'); return }
    if (condiciones.some(c => !c.valor.trim())) { setFormError('Fill in all condition values'); return }
    setSaving(true)
    setFormError(null)
    try {
      const res = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || undefined,
          condiciones,
          accion: { tipo: accionTipo },
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setFormError(d.error ?? 'Error al crear regla')
        return
      }
      closeDrawer()
      loadReglas()
    } catch {
      setFormError('Error de red')
    } finally {
      setSaving(false)
    }
  }

  // Stats
  const totalReglas  = reglas.length
  const activas      = reglas.filter(r => r.activa).length
  const ejecutadasHoy = reglas.filter(r => {
    if (!r.ultima_ejecucion) return false
    const d = new Date(r.ultima_ejecucion)
    const now = new Date()
    return d.toDateString() === now.toDateString()
  }).length

  return (
    <div className="p-8 min-h-screen" style={{ background: '#FAFAF9' }}>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] mb-1" style={{ color: '#4F46E5' }}>Automation</p>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#0A0A0A' }}>Rules</h1>
          <p className="text-sm mt-1" style={{ color: '#A3A3A3' }}>Define WHEN / IF / THEN conditions to automate actions</p>
        </div>
        <button
          onClick={openDrawer}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: '#4F46E5' }}
        >
          <Plus size={15} />
          New Rule
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total rules',    value: totalReglas,   accent: '#4F46E5' },
          { label: 'Active',         value: activas,       accent: '#059669' },
          { label: 'Run today',      value: ejecutadasHoy, accent: '#D97706' },
        ].map(s => (
          <div
            key={s.label}
            className="bg-white rounded-xl border p-4"
            style={{ borderColor: '#E7E5E4', borderLeft: `3px solid ${s.accent}` }}
          >
            <p className="text-[28px] font-extrabold mono leading-none mb-1" style={{ color: s.accent }}>{s.value}</p>
            <p className="text-xs font-semibold" style={{ color: '#525252' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Rules list */}
      {loading ? (
        <div className="space-y-3">
          {[0,1,2].map(i => (
            <div key={i} className="bg-white rounded-xl border p-5" style={{ borderColor: '#E7E5E4' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-4 w-40 rounded animate-pulse" style={{ background: '#F5F5F4' }} />
                <div className="h-4 w-16 rounded animate-pulse" style={{ background: '#F5F5F4' }} />
              </div>
              <div className="flex gap-2">
                <div className="h-6 w-28 rounded-full animate-pulse" style={{ background: '#F5F5F4' }} />
                <div className="h-6 w-24 rounded-full animate-pulse" style={{ background: '#F5F5F4' }} />
                <div className="h-6 w-20 rounded-full animate-pulse" style={{ background: '#F5F5F4' }} />
              </div>
            </div>
          ))}
        </div>
      ) : !reglas.length ? (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#E7E5E4' }}>
          <EmptyState
            icon={<GitBranch size={20} style={{ color: '#A3A3A3' }} />}
            title="No rules defined"
            description="Create your first rule to automate actions when system events occur."
            action={{ label: 'New Rule', href: '#' }}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {reglas.map(regla => (
            <div
              key={regla.id}
              className="bg-white rounded-xl border p-5"
              style={{ borderColor: '#E7E5E4', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', opacity: regla.activa ? 1 : 0.6 }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-2">
                    <h3 className="text-sm font-bold truncate" style={{ color: '#0A0A0A' }}>{regla.nombre}</h3>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={regla.activa
                        ? { background: '#ECFDF5', color: '#059669' }
                        : { background: '#F5F5F4', color: '#A3A3A3' }}
                    >
                      {regla.activa ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Condition pills */}
                  <div className="flex flex-wrap gap-2">
                    {regla.condiciones.map((c, i) => (
                      <span key={i} className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full" style={{ background: '#EEF2FF', color: '#4F46E5' }}>
                        <span className="font-bold text-[9px] uppercase tracking-wider opacity-60">
                          {i === 0 ? 'WHEN' : 'AND'}
                        </span>
                        {campoLabel(c.campo)} {opLabel(c.operador)} <span className="font-bold">{c.valor}</span>
                      </span>
                    ))}
                    <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full" style={{ background: '#ECFDF5', color: '#059669' }}>
                      <span className="font-bold text-[9px] uppercase tracking-wider opacity-60">THEN</span>
                      {accionLabel(regla.accion.tipo)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 mt-3">
                    <span className="text-[11px] mono" style={{ color: '#A3A3A3' }}>
                      {regla.veces_ejecutada} executions
                    </span>
                    {regla.ultima_ejecucion && (
                      <span className="text-[11px] mono" style={{ color: '#A3A3A3' }}>
                        Last: {relTime(regla.ultima_ejecucion)}
                      </span>
                    )}
                    {regla.creado_por && (
                      <span className="text-[11px] mono" style={{ color: '#A3A3A3' }}>
                        por {regla.creado_por.split('@')[0]}
                      </span>
                    )}
                  </div>
                </div>

                {/* Toggle */}
                <button
                  onClick={() => toggleActiva(regla)}
                  className="flex-shrink-0 mt-0.5"
                  title={regla.activa ? 'Desactivar' : 'Activar'}
                >
                  <div
                    className="relative w-10 h-5 rounded-full transition-colors duration-200"
                    style={{ background: regla.activa ? '#4F46E5' : '#D4D4D4' }}
                  >
                    <div
                      className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200"
                      style={{ transform: regla.activa ? 'translateX(22px)' : 'translateX(2px)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
                    />
                  </div>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Side drawer ─────────────────────────────────────────────────── */}
      {drawerOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.3)' }}
            onClick={closeDrawer}
          />

          {/* Drawer */}
          <div
            className="fixed right-0 top-0 h-full z-50 bg-white overflow-y-auto"
            style={{ width: 420, boxShadow: '-4px 0 24px rgba(0,0,0,0.12)' }}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: '#E7E5E4' }}>
              <h2 className="text-base font-bold" style={{ color: '#0A0A0A' }}>New Rule</h2>
              <button onClick={closeDrawer} style={{ color: '#A3A3A3' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="px-6 py-5 space-y-5">

              {/* Nombre */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#525252' }}>Rule name</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="E.g.: Urgent provision alert"
                  className="input"
                  required
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#525252' }}>Description (optional)</label>
                <input
                  type="text"
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  placeholder="Brief description"
                  className="input"
                />
              </div>

              {/* Conditions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold" style={{ color: '#525252' }}>Conditions (WHEN / AND)</label>
                  <button
                    type="button"
                    onClick={() => setCondiciones(prev => [...prev, emptyCondicion()])}
                    className="text-[11px] font-semibold flex items-center gap-1"
                    style={{ color: '#4F46E5' }}
                  >
                    <Plus size={12} /> Add
                  </button>
                </div>
                <div className="space-y-2">
                  {condiciones.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[9px] font-bold uppercase tracking-wider w-10 text-right flex-shrink-0" style={{ color: '#A3A3A3' }}>
                        {i === 0 ? 'WHEN' : 'AND'}
                      </span>
                      <select
                        value={c.campo}
                        onChange={e => setCondiciones(prev => prev.map((p, j) => j === i ? { ...p, campo: e.target.value } : p))}
                        className="input flex-1 text-[12px] py-1.5"
                      >
                        {CAMPOS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                      <select
                        value={c.operador}
                        onChange={e => setCondiciones(prev => prev.map((p, j) => j === i ? { ...p, operador: e.target.value } : p))}
                        className="input w-28 text-[12px] py-1.5"
                      >
                        {OPERADORES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                      <input
                        type="text"
                        value={c.valor}
                        onChange={e => setCondiciones(prev => prev.map((p, j) => j === i ? { ...p, valor: e.target.value } : p))}
                        placeholder="valor"
                        className="input w-24 text-[12px] py-1.5"
                      />
                      {condiciones.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setCondiciones(prev => prev.filter((_, j) => j !== i))}
                          style={{ color: '#A3A3A3' }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#525252' }}>Action (THEN)</label>
                <select
                  value={accionTipo}
                  onChange={e => setAccionTipo(e.target.value)}
                  className="input"
                >
                  {ACCIONES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>

              {formError && (
                <p className="text-[12px] font-medium" style={{ color: '#DC2626' }}>{formError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
                  style={{ borderColor: '#E7E5E4', color: '#525252' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity"
                  style={{ background: '#4F46E5', opacity: saving ? 0.75 : 1 }}
                >
                  {saving ? 'Saving…' : 'Create Rule'}
                </button>
              </div>

            </form>
          </div>
        </>
      )}
    </div>
  )
}
