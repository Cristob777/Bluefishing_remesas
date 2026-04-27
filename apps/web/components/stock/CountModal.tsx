'use client'

import { useState } from 'react'
import { X, Plus, Minus } from 'lucide-react'
import { toast } from 'sonner'

interface StockItem {
  id: string
  sku: string
  descripcion: string | null
  cantidad_invoice: number
  cantidad_recibida: number | null
  diferencia: number | null
}

interface Recepcion {
  id: string
  remesa_id: string
  remesa?: { numero_invoice: string; proveedor?: { nombre: string } }
  items?: StockItem[]
}

interface CountModalProps {
  recepcion: Recepcion
  onClose: () => void
  onSaved: () => void
}

export function CountModal({ recepcion, onClose, onSaved }: CountModalProps) {
  const items = recepcion.items ?? []

  const [counts, setCounts] = useState<Record<string, number>>(
    Object.fromEntries(items.map(i => [i.id, i.cantidad_invoice]))
  )
  const [contadoPor, setContadoPor] = useState('')
  const [saving, setSaving]         = useState(false)

  const diffs = items.filter(i => (counts[i.id] ?? i.cantidad_invoice) !== i.cantidad_invoice)

  async function handleSave() {
    if (!contadoPor.trim()) { toast.error('Indica quién realizó el conteo'); return }
    setSaving(true)
    try {
      const payload = {
        recepcion_id: recepcion.id,
        contado_por: contadoPor,
        items: items.map(i => ({
          sku: i.sku,
          descripcion: i.descripcion ?? '',
          cantidad_invoice: i.cantidad_invoice,
          cantidad_recibida: counts[i.id] ?? i.cantidad_invoice,
        })),
      }

      const res = await fetch(`/api/stock/${recepcion.remesa_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Error guardando conteo')
        return
      }

      toast.success(
        diffs.length > 0
          ? `Conteo guardado · ${diffs.length} diferencia(s) — Sebastian notificado`
          : 'Conteo guardado · Sin diferencias ✓',
        { duration: 4000 }
      )
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 animate-fade-in"
        style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      <div
        className="fixed z-50 overflow-hidden rounded-2xl animate-fade-up flex flex-col"
        style={{
          inset: '10vh 0 10vh 0',
          maxWidth: 640,
          margin: '0 auto',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 2rem)',
          background: '#FFF',
          boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b flex-shrink-0" style={{ borderColor: '#E7E5E4' }}>
          <div>
            <h3 className="text-base font-bold" style={{ color: '#0A0A0A' }}>Conteo de stock</h3>
            <p className="text-xs mt-0.5" style={{ color: '#A3A3A3' }}>
              {recepcion.remesa?.proveedor?.nombre} · {recepcion.remesa?.numero_invoice} · {items.length} SKUs
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ background: '#F5F5F4', color: '#525252' }}>
            <X size={15} />
          </button>
        </div>

        {/* SKU list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2.5">
          {items.map(item => {
            const counted = counts[item.id] ?? item.cantidad_invoice
            const diff    = counted - item.cantidad_invoice
            return (
              <div
                key={item.id}
                className="flex items-center gap-4 rounded-xl p-4 transition-colors"
                style={{
                  background: diff === 0 ? '#FAFAF9' : diff > 0 ? '#ECFDF5' : '#FEF2F2',
                  border: `1px solid ${diff === 0 ? '#E7E5E4' : diff > 0 ? '#A7F3D0' : '#FECACA'}`,
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold mono" style={{ color: '#0A0A0A' }}>{item.sku}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: '#525252' }}>{item.descripcion ?? '—'}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#A3A3A3' }}>
                    Factura: <span className="font-bold mono">{item.cantidad_invoice}</span>
                  </p>
                </div>

                {/* ± counter */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCounts(c => ({ ...c, [item.id]: Math.max(0, (c[item.id] ?? item.cantidad_invoice) - 1) }))}
                    className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                    style={{ background: '#F5F5F4', border: '1px solid #E7E5E4', color: '#525252' }}
                  >
                    <Minus size={11} />
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={counted}
                    onChange={e => setCounts(c => ({ ...c, [item.id]: Math.max(0, parseInt(e.target.value) || 0) }))}
                    className="w-16 text-center text-sm font-bold mono rounded-lg px-2 py-1.5 focus:outline-none"
                    style={{ border: '1px solid #E7E5E4', color: '#0A0A0A' }}
                  />
                  <button
                    onClick={() => setCounts(c => ({ ...c, [item.id]: (c[item.id] ?? item.cantidad_invoice) + 1 }))}
                    className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                    style={{ background: '#F5F5F4', border: '1px solid #E7E5E4', color: '#525252' }}
                  >
                    <Plus size={11} />
                  </button>
                </div>

                <div className="w-10 text-right flex-shrink-0">
                  {diff === 0 ? (
                    <span className="text-xs" style={{ color: '#A3A3A3' }}>—</span>
                  ) : (
                    <span className="text-sm font-bold mono" style={{ color: diff > 0 ? '#059669' : '#DC2626' }}>
                      {diff > 0 ? `+${diff}` : diff}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 space-y-3 flex-shrink-0" style={{ borderColor: '#E7E5E4' }}>
          {diffs.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
              <span className="text-xs font-bold" style={{ color: '#D97706' }}>
                ⚠ {diffs.length} SKU{diffs.length > 1 ? 's' : ''} con diferencias — Sebastian será notificado automáticamente
              </span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Contado por..."
              value={contadoPor}
              onChange={e => setContadoPor(e.target.value)}
              className="flex-1 input"
            />
            <button
              onClick={handleSave}
              disabled={saving || !contadoPor.trim()}
              className="btn-primary flex-shrink-0 disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Confirmar conteo'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
