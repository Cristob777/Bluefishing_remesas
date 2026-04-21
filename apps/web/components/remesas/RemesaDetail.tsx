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

export default function RemesaDetail({ remesa }: Props) {
  const [tab, setTab] = useState<Tab>('invoice')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'invoice',    label: 'Invoice' },
    { id: 'pagos',      label: `Pagos (${remesa.pagos?.length ?? 0})` },
    { id: 'stock',      label: `Stock (${remesa.recepciones?.length ?? 0})` },
    { id: 'documentos', label: `Docs (${remesa.documentos?.length ?? 0})` },
  ]

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 font-mono">
            {remesa.numero_invoice}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {remesa.proveedor?.nombre} · {remesa.proveedor?.pais}
          </p>
        </div>
        <span className={clsx('badge', ESTADO_COLORS[remesa.estado])}>
          {ESTADO_LABELS[remesa.estado]}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 px-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'py-3 px-1 mr-5 text-sm border-b-2 -mb-px transition-colors',
              tab === t.id
                ? 'border-navy-700 text-navy-800 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
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
              { label: 'Monto original',    value: formatCurrency(remesa.monto_original, remesa.moneda_origen) },
              { label: 'Moneda',            value: remesa.moneda_origen },
              { label: 'Condición pago',    value: remesa.condicion_pago ?? '—' },
              { label: 'Fecha invoice',     value: remesa.fecha_invoice ? formatDate(remesa.fecha_invoice) : '—' },
              { label: 'N° despacho',       value: remesa.numero_despacho ?? '—' },
              { label: 'DIN',               value: remesa.din_numero ?? '—' },
              { label: 'Creado',            value: formatDate(remesa.created_at) },
              { label: 'Actualizado',       value: formatDate(remesa.updated_at) },
            ].map(({ label, value }) => (
              <div key={label}>
                <dt className="text-gray-500">{label}</dt>
                <dd className="font-medium text-gray-900 mt-0.5">{value}</dd>
              </div>
            ))}
            {remesa.notas && (
              <div className="col-span-full">
                <dt className="text-gray-500">Notas</dt>
                <dd className="text-gray-700 mt-0.5 whitespace-pre-wrap">{remesa.notas}</dd>
              </div>
            )}
          </dl>
        )}

        {/* Pagos tab */}
        {tab === 'pagos' && (
          <div>
            {!remesa.pagos?.length && (
              <p className="text-sm text-gray-400">Sin pagos registrados</p>
            )}
            <div className="space-y-3">
              {remesa.pagos?.map((p) => (
                <div key={p.id} className="rounded-md border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-800">
                      {p.tipo} — {formatCurrency(p.monto_moneda_origen, p.moneda)}
                    </span>
                    <span className={clsx('badge', {
                      'bg-yellow-100 text-yellow-800': p.estado === 'PENDIENTE',
                      'bg-blue-100 text-blue-800':    p.estado === 'EMITIDO',
                      'bg-green-100 text-green-800':  p.estado === 'CONFIRMADO',
                    })}>
                      {p.estado}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-3 text-xs text-gray-500">
                    <span>CLP: {p.monto_clp ? formatCLP(p.monto_clp) : '—'}</span>
                    <span>FX: {p.fx_rate ?? '—'} · {p.fx_fecha ?? '—'}</span>
                    <span>O.P.: {p.orden_pago_numero ?? '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stock tab */}
        {tab === 'stock' && (
          <div className="space-y-4">
            {!remesa.recepciones?.length && (
              <p className="text-sm text-gray-400">Sin recepciones de stock</p>
            )}
            {remesa.recepciones?.map((rec) => (
              <div key={rec.id} className="rounded-md border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 flex items-center justify-between border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-800">
                    Recepción {formatDate(rec.fecha_recepcion)}
                  </p>
                  <span className="text-xs text-gray-500">{rec.estado}</span>
                </div>
                {rec.items && rec.items.length > 0 && (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="px-3 py-2 text-left font-medium text-gray-500">SKU</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500">Inv.</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500">Recib.</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500">Dif.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {rec.items.map((item) => (
                        <tr key={item.id} className={clsx(
                          item.diferencia !== null && item.diferencia !== 0 && 'bg-red-50'
                        )}>
                          <td className="px-3 py-2 font-mono">{item.sku}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{item.cantidad_invoice}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{item.cantidad_recibida ?? '—'}</td>
                          <td className={clsx('px-3 py-2 text-right tabular-nums font-medium', {
                            'text-red-600':   (item.diferencia ?? 0) < 0,
                            'text-green-600': (item.diferencia ?? 0) > 0,
                          })}>
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
              <p className="text-sm text-gray-400">Sin documentos adjuntos</p>
            )}
            {remesa.documentos?.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 rounded-md border border-gray-200 p-3">
                <span className="text-lg">📄</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {doc.numero ?? doc.archivo_nombre ?? doc.tipo}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {doc.tipo} · {doc.fecha ? formatDate(doc.fecha) : formatDate(doc.created_at)}
                    {doc.monto && doc.moneda ? ` · ${formatCurrency(doc.monto, doc.moneda as import('@/types').Currency)}` : ''}
                  </p>
                </div>
                {doc.archivo_url && (
                  <a
                    href={doc.archivo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
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
