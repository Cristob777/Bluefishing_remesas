import Link from 'next/link'
import { createServerClient } from '@/lib/supabase'
import { formatCurrency, formatDate, ESTADO_LABELS, ESTADO_COLORS } from '@/lib/utils'
import type { Remesa } from '@/types'
import { clsx } from 'clsx'

export default async function RemesasPage({
  searchParams,
}: {
  searchParams: { estado?: string }
}) {
  const sb = createServerClient()
  const { estado } = await searchParams

  let query = sb
    .from('remesas')
    .select('*, proveedor:proveedores(nombre, pais, moneda)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (estado) query = query.eq('estado', estado)

  const { data: remesas } = await query

  const ESTADOS = [
    'INVOICE_RECIBIDO', 'PAGO_PENDIENTE', 'PAGO_PARCIAL', 'PAGO_COMPLETO',
    'EN_ADUANA', 'PROVISION_RECIBIDA', 'MERCADERIA_RECIBIDA', 'RECONCILIADO',
  ]

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Remesas</h1>
        <p className="text-sm text-gray-500 mt-0.5">Todas las importaciones y su estado</p>
      </div>

      {/* Filtros de estado */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/dashboard/remesas"
          className={clsx(
            'badge border',
            !estado ? 'bg-navy-800 text-white border-navy-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
          )}
        >
          Todas
        </Link>
        {ESTADOS.map((e) => (
          <Link
            key={e}
            href={`/dashboard/remesas?estado=${e}`}
            className={clsx(
              'badge border',
              estado === e
                ? 'bg-navy-800 text-white border-navy-800'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            )}
          >
            {ESTADO_LABELS[e]}
          </Link>
        ))}
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-600">Invoice</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Proveedor</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Monto</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Despacho</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!remesas?.length && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Sin remesas{estado ? ` con estado "${ESTADO_LABELS[estado]}"` : ''}
                </td>
              </tr>
            )}
            {(remesas as Remesa[])?.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono font-medium text-navy-800">
                  {r.numero_invoice}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {r.proveedor?.nombre ?? '—'}
                </td>
                <td className="px-4 py-3 tabular-nums text-gray-700">
                  {formatCurrency(r.monto_original, r.moneda_origen)}
                </td>
                <td className="px-4 py-3">
                  <span className={clsx('badge', ESTADO_COLORS[r.estado])}>
                    {ESTADO_LABELS[r.estado]}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">
                  {r.numero_despacho ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {r.fecha_invoice ? formatDate(r.fecha_invoice) : formatDate(r.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
