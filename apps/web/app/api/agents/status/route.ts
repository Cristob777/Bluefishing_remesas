import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const agentNames = ['invoice_intake', 'customs_funds', 'din_reconciliation', 'landed_cost']

    const { data: logs } = await supabase
      .from('agent_logs')
      .select('agent_name, resultado, created_at')
      .in('agent_name', agentNames)
      .order('created_at', { ascending: false })
      .limit(40)

    const agents: Record<string, { status: string; lastRun: string | null }> = {}

    for (const name of agentNames) {
      const agentLogs = (logs ?? []).filter(l => l.agent_name === name)
      const latest    = agentLogs[0]

      let status = 'idle'
      if (latest?.resultado === 'RUNNING')          status = 'running'
      else if (latest?.resultado === 'ERROR')        status = 'error'
      else if (latest?.resultado === 'SUCCESS')      status = 'idle'

      const lastRun = latest?.created_at
        ? `hace ${formatDistanceToNow(new Date(latest.created_at), { locale: es })}`
        : null

      agents[name] = { status, lastRun }
    }

    return NextResponse.json({ agents })
  } catch {
    return NextResponse.json({ agents: {} })
  }
}
