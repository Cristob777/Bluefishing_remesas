'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Package } from 'lucide-react'
import { CountModal } from '@/components/stock/CountModal'
import type { StockRecepcion, StockItem } from '@/types'

type Recepcion = StockRecepcion & {
  items?: StockItem[]
  remesa?: { numero_invoice: string; proveedor?: { nombre: string } }
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
  const pct  = Math.min(Math.abs(diff) / total * 100, 100)
  const pos  = diff > 0
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 h-1 rounded-full" style={{ background: '#E7E5E4', width: 48 }}>
        <div
          className="absolute top-0 h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: pos ? '#059669' : '#DC2626',
            [pos ? 'left' : 'right']: 0,
          }}
        />
      </div>
      <span
        className="text-[11px] font-bold mono"
        style={{ color: pos ? '#059669' : '#DC2626' }}
      >
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

  return (
    <div className="p-8 min-h-screen animate-fade-in" style={{ background: '#FAFAF9' }}>
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] mb-1" style={{ color: '#4F46E5' }}>Inventario</p>
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#0A0A0A' }}>Stock y Recepción</h1>
        <p className="text-sm mt-1" style={{ color: '#A3A3A3' }}>
          {recepciones.length} recepciones · control de conteo y diferencias
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[0,1,2].map(i => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.3 }}
              className="card p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-40 rounded animate-pulse" style={{ background: '#F5F5F4' }} />
                  <div className="h-4 w-20 rounded animate-pulse" style={{ background: '#F5F5F4' }} />
                </div>
                <div className="h-4 w-24 rounded animate-pulse" style={{ background: '#F5F5F4' }} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[0,1,2].map(j => (
                  <div key={j} className="space-y-2">
                    <div className="h-3 w-16 rounded animate-pulse" style={{ background: '#F5F5F4' }} />
                    <div className="h-6 w-12 rounded animate-pulse" style={{ background: '#F5F5F4' }} />
                  </div>
                ))}
              </div>
              <div className="h-px" style={{ background: '#F5F5F4' }} />
              <div className="space-y-2">
                {[0,1,2].map(k => <div key={k} className="h-4 rounded animate-pulse" style={{ background: '#F5F5F4' }} />)}
              </div>
            </motion.div>
          ))}
        </div>
      ) : !recepciones.length ? (
        <EmptyState
          icon={<Package size={20} style={{ color: '#A3A3A3' }} />}
          title="Sin recepciones de stock"
          description="Aparecerán aquí cuando bodega registre el ingreso de mercadería."
          action={{ label: 'Ver remesas activas', href: '/dashboard/remesas' }}
        />
      ) : (
        <div className="space-y-5">
          {recepciones.map((rec, recIdx) => {
            const items        = (rec.items ?? []) as StockItem[]
            const withDiff     = items.filter(i => (i.diferencia ?? 0) !== 0)
            const pct          = items.length > 0 ? Math.round((items.filter(i => (i.diferencia ?? 0) === 0).length / items.length) * 100) : 100
            const barColor     = pct === 100 ? '#059669' : pct >= 80 ? '#D97706' : '#DC2626'
            const visibleItems = items.slice(0, 5)
            const hasMore      = items.length > 5

            return (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(recIdx * 0.05, 0.25), duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="card overflow-hidden"
              >
                {/* Card header */}
                <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#E7E5E4' }}>
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-bold" style={{ color: '#0A0A0A' }}>
                        {rec.remesa?.proveedor?.nombre ?? 'Proveedor desconocido'}
                      </p>
                      <p className="text-xs mono mt-0.5" style={{ color: '#A3A3A3' }}>
                        Factura {rec.remesa?.numero_invoice ?? rec.remesa_id.slice(0, 8)}
                      </p>
                    </div>
                    <Badge variant={ESTADO_BADGE[rec.estado] ?? 'neutral'} size="sm">
                      {ESTADO_LABEL[rec.estado] ?? rec.estado}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#A3A3A3' }}>Recibido</p>
                      <p className="text-xs mono" style={{ color: '#525252' }}>
                        {new Date(rec.fecha_recepcion).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </p>
                    </div>
                    {rec.estado === 'PENDIENTE' && (
                      <button
                        onClick={() => setCounting(rec)}
                        className="btn-primary text-xs px-3 py-1.5"
                      >
                        Contar stock
                      </button>
                    )}
                  </div>
                </div>

                {/* Mini stats */}
                <div className="grid grid-cols-3 divide-x px-0" style={{ borderBottom: '1px solid #E7E5E4', borderColor: '#E7E5E4' }}>
                  {[
                    { label: 'Total SKUs',       value: items.length,    color: '#525252' },
                    { label: 'Con diferencia',   value: withDiff.length, color: withDiff.length > 0 ? '#DC2626' : '#059669' },
                    { label: 'Completado',       value: `${pct}%`,       color: barColor },
                  ].map(s => (
                    <div key={s.label} className="px-6 py-3">
                      <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#A3A3A3' }}>{s.label}</p>
                      <p className="text-lg font-extrabold mono" style={{ color: s.color }}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* SKU table */}
                {items.length > 0 && (
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr style={{ background: '#FAFAF9', borderBottom: '1px solid #E7E5E4', position: 'sticky', top: 0, zIndex: 10 }}>
                        <th className="th">SKU</th>
                        <th className="th">Descripción</th>
                        <th className="th text-right">Fact.</th>
                        <th className="th text-right">Recibido</th>
                        <th className="th">Diferencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleItems.map((item, i) => (
                        <tr
                          key={item.id}
                          style={{
                            borderBottom: i < visibleItems.length - 1 ? '1px solid #F5F5F4' : 'none',
                            background: (item.diferencia ?? 0) !== 0 ? 'rgba(254,242,242,0.4)' : undefined,
                          }}
                        >
                          <td className="td mono font-semibold text-[11px]" style={{ color: '#0A0A0A' }}>{item.sku}</td>
                          <td className="td text-[11px]" style={{ color: '#525252' }}>{item.descripcion ?? '—'}</td>
                          <td className="td text-right mono" style={{ color: '#A3A3A3' }}>{item.cantidad_invoice}</td>
                          <td className="td text-right mono font-medium" style={{ color: '#0A0A0A' }}>
                            {item.cantidad_recibida ?? <span style={{ color: '#A3A3A3' }}>—</span>}
                          </td>
                          <td className="td">
                            {item.diferencia !== null
                              ? <DiffBar diff={item.diferencia} total={item.cantidad_invoice} />
                              : <span style={{ color: '#A3A3A3' }}>—</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Footer */}
                <div className="px-6 py-4 flex items-center justify-between border-t" style={{ borderColor: '#E7E5E4' }}>
                  <div className="flex-1 max-w-xs">
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: '#E7E5E4' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                    </div>
                    <p className="text-[10px] mt-1.5" style={{ color: '#A3A3A3' }}>
                      {items.length} SKUs
                      {withDiff.length > 0
                        ? <span style={{ color: '#B45309' }}> · {withDiff.length} con diferencias</span>
                        : <span style={{ color: '#059669' }}> · sin diferencias</span>
                      }
                    </p>
                  </div>
                  {hasMore && (
                    <span className="text-xs font-medium" style={{ color: '#4F46E5' }}>
                      +{items.length - 5} ítems más →
                    </span>
                  )}
                </div>
              </motion.div>
            )
          })}
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
