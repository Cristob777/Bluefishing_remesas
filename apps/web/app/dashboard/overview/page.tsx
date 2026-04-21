import { createServerClient } from '@/lib/supabase'
import { formatCLP, formatDate, ESTADO_LABELS, ESTADO_COLORS } from '@/lib/utils'
import type { Alerta, AgentLog } from '@/types'
import { clsx } from 'clsx'

const ALERTA_ICONS: Record<string, string> = {
  PROVISION_URGENTE:   '⚠',
  PAGO_PENDIENTE:      '💳',
  DIFERENCIA_STOCK:    '📦',
  APROBACION_REQUERIDA:'🔒',
}

export default async function OverviewPage() {
  const sb = createServerClient()

  const [
    { count: remesasActivas },
    { count: pagosP },
    { count: provisionesU },
    { count: stockDiff },
    { data: alertas },
    { data: logs },
  ] = await Promise.all([
    sb.from('remesas').select('id', { count: 'exact', head: true }).neq('estado', 'RECONCILIADO'),
    sb.from('pagos').select('id', { count: 'exact', head: true }).eq('estado', 'PENDIENTE'),
    sb.from('provisiones_fondos').select('id', { count: 'exact', head: true })
      .eq('es_urgente', true).eq('estado', 'PENDIENTE'),
    sb.from('stock_recepciones').select('id', { count: 'exact', head: true })
      .eq('estado', 'CON_DIFERENCIAS'),
    sb.from('alertas').select('*').eq('leida', false)
      .order('urgente', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(6),
    sb.from('agent_logs').select('*')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const stats = [
    { label: 'Remesas activas',      value: remesasActivas ?? 0, color: 'text-blue-700',   bg: 'bg-blue-50'   },
    { label: 'Pagos pendientes',     value: pagosP ?? 0,         color: 'text-yellow-700', bg: 'bg-yellow-50' },
    { label: 'Provisiones urgentes', value: provisionesU ?? 0,   color: 'text-red-700',    bg: 'bg-red-50'    },
    { label: 'Diferencias stock',    value: stockDiff ?? 0,      color: 'text-orange-700', bg: 'bg-orange-50' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-500 mt-0.5">Estado general del sistema de remesas</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className={clsx('card p-5', s.bg)}>
            <p className="text-sm text-gray-600">{s.label}</p>
            <p className={clsx('text-3xl font-bold mt-1', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Alertas sin leer */}
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-medium text-gray-900">Alertas pendientes</h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {!alertas?.length && (
              <li className="px-5 py-4 text-sm text-gray-400">Sin alertas pendientes</li>
            )}
            {(alertas as Alerta[])?.map((a) => (
              <li key={a.id} className="flex gap-3 px-5 py-3">
                <span className="mt-0.5 text-lg">{ALERTA_ICONS[a.tipo] ?? '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{a.mensaje}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(a.created_at)}</p>
                </div>
                {a.urgente && (
                  <span className="self-center badge bg-red-100 text-red-700">Urgente</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Agent activity */}
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-medium text-gray-900">Actividad de agentes</h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {!logs?.length && (
              <li className="px-5 py-4 text-sm text-gray-400">Sin actividad reciente</li>
            )}
            {(logs as AgentLog[])?.map((l) => (
              <li key={l.id} className="flex items-center gap-3 px-5 py-3">
                <span className={clsx(
                  'h-2 w-2 rounded-full flex-shrink-0',
                  l.resultado === 'SUCCESS' ? 'bg-green-500' :
                  l.resultado === 'ERROR'   ? 'bg-red-500'   : 'bg-yellow-500'
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{l.accion}</p>
                  <p className="text-xs text-gray-400">{l.agent_name} · {formatDate(l.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
