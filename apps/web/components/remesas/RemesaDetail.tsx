'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import { formatCurrency, formatCLP, formatDate, ESTADO_LABELS, ESTADO_COLORS } from '@/lib/utils'
import type { Remesa, Pago, Documento, Alerta, StockRecepcion, StockItem } from '@/types'

interface Props {
  remesa: Remesa & {
    proveedor?: { nombre: string; pais: string; moneda: string }
    pagos?: Pago[]
    documentos?: Documento[]
    alertas?: Alerta[]
    recepciones?: (StockRecepcion & { items?: StockItem[] })[]
  }
}

type Tab = 'invoice' | 'pagos' | 'stock' | 'documentos'

const PAGO_ESTADO_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  PENDIENTE: { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
  EMITIDO: { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
  CONFIRMADO: { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' },
}

export default function RemesaDetail({ remesa }: Props) {
  const [tab, setTab] = useState<Tab>('invoice')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'invoice', label: 'Invoice' },
    { id: 'pagos', label: `Pagos (${remesa.pagos?.length ?? 0})` },
    { id: 'stock', label: `Stock (${remesa.recepciones?.length ?? 0})` },
    { id: 'documentos', label: `Docs (${remesa.documentos?.length ?? 0})` },
  ]

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-6 py-5 border-b" style={{ borderColor: '#E5E7EB' }}>
        <div>
          <h2 className="text-lg font-semibold font-mono" style={{ color: '#111827' }}>
            {remesa.numero_invoice}
          </h2>
          <p className="text-sm mt-0.5" style={{ color: '#9CA3AF' }}>
            {remesa.proveedor?.nombre} · {remesa.proveedor?.pais}
          </p>
        </div>
        <span className={clsx('badge')}
          style={{
            background: ESTADO_COLORS[remesa.estado]?.bg ?? '#F3F4F6',
            color: ESTADO_COLORS[remesa.estado]?.color ?? '#4B5563',
            border: `1px solid ${ESTADO_COLORS[remesa.estado]?.border ?? '#E5E7EB'}`,
          }}>
          {ESTADO_LABELS[remesa.estado]}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b px-6" style={{ borderColor: '#E5E7EB' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'py-3 px-1 mr-5 text-sm border-b-2 -mb-px transition-colors',
              tab === t.id
                ? 'font-semibold'
                : 'border-transparent hover:border-gray-300'
            )}
            style={
              tab === t.id
                ? { borderColor: '#2563EB', color: '#2563EB' }
                : { color: '#9CA3AF' }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* Invoice tab */}
        {tab === 'invoice' && (
          <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm sm:grid-cols-3">
            {[
              { label: 'Monto original', value: formatCurrency(remesa.monto_original, remesa.moneda_origen) },
              { label: 'Moneda', value: remesa.moneda_origen },
              { label: 'Condición pago', value: remesa.condicion_pago ?? '—' },
              { label: 'Fecha invoice', value: remesa.fecha_invoice ? formatDate(remesa.fecha_invoice) : '—' },
              { label: 'N° despacho', value: remesa.numero_despacho ?? '—' },
              { label: 'DIN', value: remesa.din_numero ?? '—' },
              { label: 'Creado', value: formatDate(remesa.created_at) },
              { label: 'Actualizado', value: formatDate(remesa.updated_at) },
            ].map(({ label, value }) => (
              <div key={label}>
                <dt style={{ color: '#9CA3AF' }}>{label}</dt>
                <dd className="font-medium mt-0.5" style={{ color: '#111827' }}>{value}</dd>
              </div>
            ))}
            {remesa.notas && (
              <div className="col-span-full">
                <dt style={{ color: '#9CA3AF' }}>Notas</dt>
                <dd className="mt-0.5 whitespace-pre-wrap" style={{ color: '#4B5563' }}>{remesa.notas}</dd>
              </div>
            )}
          </dl>
        )}

        {/* Pagos tab */}
        {tab === 'pagos' && (
          <div>
            {!remesa.pagos?.length && (
              <p className="text-sm" style={{ color: '#9CA3AF' }}>Sin pagos registrados</p>
            )}
            <div className="space-y-3">
              {remesa.pagos?.map((p) => {
                const style = PAGO_ESTADO_STYLE[p.estado] ?? PAGO_ESTADO_STYLE.PENDIENTE
                return (
                  <div key={p.id} className="rounded-xl border p-4" style={{ borderColor: '#E5E7EB' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium" style={{ color: '#111827' }}>
                        {p.tipo} — {formatCurrency(p.monto_moneda_origen, p.moneda)}
                      </span>
                      <span className="badge"
                        style={{
                          background: style.bg,
                          color: style.color,
                          border: `1px solid ${style.border}`,
                        }}>
                        {p.estado}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-3 text-xs" style={{ color: '#6B7280' }}>
                      <span>CLP: {p.monto_clp ? formatCLP(p.monto_clp) : '—'}</span>
                      <span>FX: {p.fx_rate ?? '—'} · {p.fx_fecha ?? '—'}</span>
                      <span>O.P.: {p.orden_pago_numero ?? '—'}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Stock tab */}
        {tab === 'stock' && (
          <div className="space-y-4">
            {!remesa.recepciones?.length && (
              <p className="text-sm" style={{ color: '#9CA3AF' }}>Sin recepciones de stock</p>
            )}
            {remesa.recepciones?.map((rec) => (
              <div key={rec.id} className="rounded-xl border overflow-hidden" style={{ borderColor: '#E5E7EB' }}>
                <div className="px-4 py-3 flex items-center justify-between border-b"
                  style={{ background: '#FAFBFC', borderColor: '#E5E7EB' }}>
                  <p className="text-sm font-medium" style={{ color: '#111827' }}>
                    Recepción {formatDate(rec.fecha_recepcion)}
                  </p>
                  <span className="text-xs" style={{ color: '#9CA3AF' }}>{rec.estado}</span>
                </div>
                {rec.items && rec.items.length > 0 && (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b" style={{ borderColor: '#E5E7EB' }}>
                        <th className="px-3 py-2 text-left font-semibold" style={{ color: '#9CA3AF' }}>SKU</th>
                        <th className="px-3 py-2 text-right font-semibold" style={{ color: '#9CA3AF' }}>Inv.</th>
                        <th className="px-3 py-2 text-right font-semibold" style={{ color: '#9CA3AF' }}>Recib.</th>
                        <th className="px-3 py-2 text-right font-semibold" style={{ color: '#9CA3AF' }}>Dif.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rec.items.map((item) => (
                        <tr key={item.id}
                          className="border-b"
                          style={{
                            borderColor: '#F3F4F6',
                            background: (item.diferencia !== null && item.diferencia !== 0) ? '#FEF2F2' : undefined,
                          }}>
                          <td className="px-3 py-2 font-mono" style={{ color: '#4B5563' }}>{item.sku}</td>
                          <td className="px-3 py-2 text-right tabular-nums" style={{ color: '#111827' }}>{item.cantidad_invoice}</td>
                          <td className="px-3 py-2 text-right tabular-nums" style={{ color: '#111827' }}>{item.cantidad_recibida ?? '—'}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-medium"
                            style={{
                              color: (item.diferencia ?? 0) < 0 ? '#DC2626'
                                : (item.diferencia ?? 0) > 0 ? '#059669'
                                  : '#9CA3AF',
                            }}>
                            {item.diferencia !== null
                              ? (item.diferencia > 0 ? `+${item.diferencia}` : item.diferencia)
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Documentos tab */}
        {tab === 'documentos' && (
          <div className="space-y-2">
            {!remesa.documentos?.length && (
              <p className="text-sm" style={{ color: '#9CA3AF' }}>Sin documentos adjuntos</p>
            )}
            {remesa.documentos?.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 rounded-xl border p-3"
                style={{ borderColor: '#E5E7EB' }}>
                <div className="flex items-center justify-center w-9 h-9 rounded-lg text-lg"
                  style={{ background: '#EFF6FF' }}>
                  📄
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#111827' }}>
                    {doc.numero ?? doc.archivo_nombre ?? doc.tipo}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
                    {doc.tipo} · {doc.fecha ? formatDate(doc.fecha) : formatDate(doc.created_at)}
                    {doc.monto && doc.moneda ? ` · ${formatCurrency(doc.monto, doc.moneda as import('@/types').Currency)}` : ''}
                  </p>
                </div>
                {doc.archivo_url && (
                  <a
                    href={doc.archivo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                    style={{ color: '#2563EB', background: '#EFF6FF' }}
                  >
                    Ver
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
