import { createServerClient } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import type { AgentLog } from '@/types'
import { clsx } from 'clsx'

const AGENT_COLORS: Record<string, string> = {
  invoice_intake:     'bg-blue-100 text-blue-800',
  customs_funds:      'bg-orange-100 text-orange-800',
  din_reconciliation: 'bg-purple-100 text-purple-800',
  landed_cost:        'bg-green-100 text-green-800',
}

export default async function AgentsPage() {
  const sb = createServerClient()

  const { data: logs } = await sb
    .from('agent_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  // Stats por agente
  const counts: Record<string, { success: number; error: number }> = {}
  for (const log of (logs as AgentLog[]) ?? []) {
    if (!counts[log.agent_name]) counts[log.agent_name] = { success: 0, error: 0 }
    if (log.resultado === 'SUCCESS') counts[log.agent_name].success++
    if (log.resultado === 'ERROR')   counts[log.agent_name].error++
  }

  const agents = ['invoice_intake', 'customs_funds', 'din_reconciliation', 'landed_cost']

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Agentes</h1>
        <p className="text-sm text-gray-500 mt-0.5">Actividad y logs de los 4 agentes Claude</p>
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {agents.map((a) => (
          <div key={a} className="card p-4">
            <span className={clsx('badge mb-2', AGENT_COLORS[a])}>{a.replace('_', ' ')}</span>
            <div className="flex gap-4 mt-2">
              <div>
                <p className="text-xs text-gray-500">OK</p>
                <p className="text-lg font-bold text-green-600">{counts[a]?.success ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Error</p>
                <p className="text-lg font-bold text-red-600">{counts[a]?.error ?? 0}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Log table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-medium text-gray-900">Últimos 100 eventos</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-600">Agente</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Acción</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Resultado</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Session</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!logs?.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Sin actividad registrada
                </td>
              </tr>
            )}
            {(logs as AgentLog[])?.map((l) => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5">
                  <span className={clsx('badge', AGENT_COLORS[l.agent_name] ?? 'bg-gray-100 text-gray-700')}>
                    {l.agent_name}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{l.accion}</td>
                <td className="px-4 py-2.5">
                  <span className={clsx('badge', {
                    'bg-green-100 text-green-800':  l.resultado === 'SUCCESS',
                    'bg-red-100 text-red-800':      l.resultado === 'ERROR',
                    'bg-yellow-100 text-yellow-800': l.resultado === 'PENDING_APPROVAL',
                  })}>
                    {l.resultado ?? 'running'}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-gray-400 truncate max-w-[120px]">
                  {l.session_id ?? '—'}
                </td>
                <td className="px-4 py-2.5 text-gray-500">{formatDate(l.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
