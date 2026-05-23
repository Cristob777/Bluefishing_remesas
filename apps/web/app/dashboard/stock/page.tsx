'use client'

import { useEffect, useState, useCallback } from 'react'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Package } from 'lucide-react'
import { CountModal } from '@/components/stock/CountModal'
import type { StockRecepcion, StockItem } from '@/types'

type Recepcion = StockRecepcion & {
  items?: StockItem[]
  remesa?: { numero_invoice: string; proveedor?: { nombre: string } }
}

type FlatItem = StockItem & {
  recepcion: Recepcion
  proveedor: string
  numero_invoice: string
  fecha_recepcion: string
}

const ESTADO_BADGE: Record<string, 'pending' | 'success' | 'purple' | 'info'> = {
  PENDIENTE:       'pending',
  INGRESADO_BSALE: 'success',
  CON_DIFERENCIAS: 'purple',
  CONTADO:         'info',
}

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE:       'Pendiente',
  INGRESADO_BSALE: 'En Bsale',
  CON_DIFERENCIAS: 'Con diferencias',
  CONTADO:         'Contado',
}

function DiffBar({ diff, total }: { diff: number; total: number }) {
  if (diff === 0) return <span style={{ color: '#059669' }}>—</span>
  const pct = Math.min(Math.abs(diff) / total * 100, 100)
  const pos = diff > 0
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1 rounded-full" style={{ background: '#E7E5E4', width: 40 }}>
        <div
          className="absolute top-0 h-full rounded-full"
          style={{ width: `${pct}%`, background: pos ? '#059669' : '#DC2626', [pos ? 'left' : 'right']: 0 }}
        />
      </div>
      <span className="text-[11px] font-bold mono" style={{ color: pos ? '#059669' : '#DC2626' }}>
        {pos ? `+${diff}` : diff}
      </span>
    </div>
  )
}

export default function StockPage() {
  const [recepciones, setRecepciones] = useState<Recepcion[]>([])
  const [loading, setLoading]         = useState(true)
  const [counting, setCounting]       = useState<Recepcion | null>(null)

  const load = useCallback(() => {
    fetch('/api/stock/all')
      .then(r => r.json())
      .then(d => setRecepciones(d.recepciones ?? []))
      .catch(() => setRecepciones([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  // Flatten all items from all recepciones
  const flatItems: FlatItem[] = recepciones.flatMap(rec =>
    (rec.items ?? []).map(item => ({
      ...item,
      recepcion: rec,
      proveedor: rec.remesa?.proveedor?.nombre ?? '—',
      numero_invoice: rec.remesa?.numero_invoice ?? rec.remesa_id.slice(0, 8),
      fecha_recepcion: rec.fecha_recepcion,
    }))
  )

  // Stat card values
  const totalSKUs     = flatItems.length
  const conDiferencias = flatItems.filter(i => (i.diferencia ?? 0) !== 0).length
  const enBsale       = recepciones.filter(r => r.estado === 'INGRESADO_BSALE').length
  const pendientes    = recepciones.filter(r => r.estado === 'PENDIENTE').length

  const STAT_CARDS = [
    { label: 'Total SKUs',       value: totalSKUs,      accent: '#4F46E5' },
    { label: 'Con diferencias',  value: conDiferencias, accent: conDiferencias > 0 ? '#DC2626' : '#059669' },
    { label: 'Ingresados Bsale', value: enBsale,        accent: '#059669' },
    { label: 'Pendientes',       value: pendientes,     accent: pendientes > 0 ? '#D97706' : '#059669' },
  ]

  return (
    <div className="p-8 min-h-screen" style={{ background: '#FAFAF9' }}>

      {/* Header */}
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] mb-1" style={{ color: '#4F46E5' }}>Inventario</p>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#0A0A0A' }}>Stock y Recepción</h1>
        <p className="text-sm mt-1" style={{ color: '#A3A3A3' }}>
          {recepciones.length} recepciones · {totalSKUs} SKUs en total
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {STAT_CARDS.map(s => (
          <div
            key={s.label}
            className="bg-white rounded-xl p-4 border"
            style={{ borderColor: '#E7E5E4', borderLeft: `3px solid ${s.accent}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
          >
            <p className="text-[28px] font-extrabold mono leading-none mb-1" style={{ color: s.accent }}>{s.value}</p>
            <p className="text-xs font-semibold" style={{ color: '#525252' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#E7E5E4' }}>
          {[0,1,2,3,4].map(i => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b" style={{ borderColor: '#F5F5F4' }}>
              <div className="h-3 w-24 rounded animate-pulse" style={{ background: '#F5F5F4' }} />
              <div className="h-3 w-32 rounded animate-pulse" style={{ background: '#F5F5F4' }} />
              <div className="h-3 w-20 rounded animate-pulse" style={{ background: '#F5F5F4' }} />
              <div className="h-3 w-12 rounded animate-pulse ml-auto" style={{ background: '#F5F5F4' }} />
            </div>
          ))}
        </div>
      ) : !flatItems.length ? (
        <EmptyState
          icon={<Package size={20} style={{ color: '#A3A3A3' }} />}
          title="Sin recepciones de stock"
          description="Aparecerán aquí cuando bodega registre el ingreso de mercadería."
          action={{ label: 'Ver remesas activas', href: '/dashboard/remesas' }}
        />
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#E7E5E4' }}>
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 z-10 bg-white">
              <tr style={{ borderBottom: '1px solid #E7E5E4' }}>
                {['SKU', 'Descripción', 'Proveedor', 'Factura', 'Fact.', 'Recibido', 'Diferencia', 'Estado', ''].map(h => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: '#A3A3A3', background: '#FAFAF9' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {flatItems.map((item, i) => (
                <tr
                  key={item.id}
                  className="transition-colors hover:bg-stone-50"
                  style={{
                    borderBottom: i < flatItems.length - 1 ? '1px solid #F5F5F4' : 'none',
                    background: (item.diferencia ?? 0) !== 0 ? 'rgba(254,242,242,0.4)' : undefined,
                  }}
                >
                  <td className="px-4 py-3 font-semibold mono text-[11px]" style={{ color: '#0A0A0A' }}>
                    {item.sku}
                  </td>
                  <td className="px-4 py-3 max-w-[180px] truncate" style={{ color: '#525252' }}>
                    {item.descripcion ?? '—'}
                  </td>
                  <td className="px-4 py-3" style={{ color: '#525252' }}>
                    {item.proveedor}
                  </td>
                  <td className="px-4 py-3 mono text-[11px]" style={{ color: '#A3A3A3' }}>
                    {item.numero_invoice}
                  </td>
                  <td className="px-4 py-3 text-right mono" style={{ color: '#A3A3A3' }}>
                    {item.cantidad_invoice}
                  </td>
                  <td className="px-4 py-3 text-right mono font-medium" style={{ color: '#0A0A0A' }}>
                    {item.cantidad_recibida ?? <span style={{ color: '#A3A3A3' }}>—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {item.diferencia !== null
                      ? <DiffBar diff={item.diferencia} total={item.cantidad_invoice} />
                      : <span style={{ color: '#A3A3A3' }}>—</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={ESTADO_BADGE[item.recepcion.estado] ?? 'neutral'} size="sm">
                      {ESTADO_LABEL[item.recepcion.estado] ?? item.recepcion.estado}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {item.recepcion.estado === 'PENDIENTE' && (
                      <button
                        onClick={() => setCounting(item.recepcion)}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors"
                        style={{ background: '#EEF2FF', color: '#4F46E5' }}
                      >
                        Contar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {counting && (
        <CountModal
          recepcion={counting as any}
          onClose={() => setCounting(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
