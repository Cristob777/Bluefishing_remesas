import { createServerClient } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import type { StockRecepcion, StockItem } from '@/types'
import { clsx } from 'clsx'

const RECEPCION_COLORS: Record<string, string> = {
  PENDIENTE:       'bg-gray-100 text-gray-700',
  CONTADO:         'bg-blue-100 text-blue-800',
  INGRESADO_BSALE: 'bg-green-100 text-green-800',
  CON_DIFERENCIAS: 'bg-red-100 text-red-800',
}

export default async function StockPage() {
  const sb = createServerClient()

  const { data: recepciones } = await sb
    .from('stock_recepciones')
    .select(`
      *,
      items:stock_items(*),
      remesa:remesas(numero_invoice, proveedor:proveedores(nombre))
    `)
    .order('fecha_recepcion', { ascending: false })
    .limit(50)

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Stock</h1>
        <p className="text-sm text-gray-500 mt-0.5">Recepciones de mercadería por remesa</p>
      </div>

      <div className="space-y-4">
        {!recepciones?.length && (
          <div className="card p-8 text-center text-gray-400">Sin recepciones registradas</div>
        )}
        {(recepciones as (StockRecepcion & { remesa?: { numero_invoice: string; proveedor?: { nombre: string } } })[])
          ?.map((rec) => (
          <div key={rec.id} className="card overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900">
                  {rec.remesa?.numero_invoice ?? rec.remesa_id.slice(0, 8)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {rec.remesa?.proveedor?.nombre} · Recepción {formatDate(rec.fecha_recepcion)}
                </p>
              </div>
              <span className={clsx('badge', RECEPCION_COLORS[rec.estado])}>
                {rec.estado.replace('_', ' ')}
              </span>
            </div>

            {/* Items */}
            {rec.items && rec.items.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-2 text-left font-medium text-gray-500 text-xs">SKU</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 text-xs">Descripción</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500 text-xs">Invoice</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500 text-xs">Recibido</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500 text-xs">Dif.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(rec.items as StockItem[]).map((item) => (
                    <tr key={item.id} className={clsx(
                      item.diferencia !== null && item.diferencia !== 0 && 'bg-red-50'
                    )}>
                      <td className="px-4 py-2 font-mono text-xs">{item.sku}</td>
                      <td className="px-4 py-2 text-gray-600 truncate max-w-[200px]">
                        {item.descripcion ?? '—'}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{item.cantidad_invoice}</td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {item.cantidad_recibida ?? '—'}
                      </td>
                      <td className={clsx('px-4 py-2 text-right tabular-nums font-medium', {
                        'text-red-600':   (item.diferencia ?? 0) < 0,
                        'text-green-600': (item.diferencia ?? 0) > 0,
                        'text-gray-400':  item.diferencia === 0,
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

            {rec.items?.length === 0 && (
              <p className="px-5 py-3 text-sm text-gray-400">Sin ítems registrados</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
