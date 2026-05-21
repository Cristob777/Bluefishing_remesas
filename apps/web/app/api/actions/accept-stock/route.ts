import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { withRole, readJsonBody, type AuthUser } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'
import { safeError } from '@/lib/errors'

const Schema = z.object({
  recepcion_id: z.string().uuid(),
  alert_id:     z.string().uuid().optional(),
  resolution:   z.enum(['accept', 'reject']),
})

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export const POST = withRole(['warehouse', 'owner', 'finance'], async (req: NextRequest, user: AuthUser) => {
  const limited = rateLimit(req, 'action', user.id)
  if (limited) return limited

  let body: unknown
  try {
    body = await readJsonBody(req, 10_000)
  } catch {
    return NextResponse.json({ error: 'Invalid or oversized request' }, { status: 400 })
  }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.issues.map(i => i.message) },
      { status: 400 },
    )
  }

  const { recepcion_id, alert_id, resolution } = parsed.data
  const newEstado = resolution === 'accept' ? 'INGRESADO_BSALE' : 'CON_DIFERENCIAS'
  const supabase  = sb()

  try {
    const { error } = await supabase
      .from('stock_recepciones')
      .update({
        estado:             newEstado,
        ingresado_bsale_at: resolution === 'accept' ? new Date().toISOString() : null,
      })
      .eq('id', recepcion_id)

    if (error) throw error

    if (alert_id) {
      // SECURITY: scope alert update to this recepcion so users can't clear arbitrary alerts.
      await supabase
        .from('alertas')
        .update({ leida: true, leida_at: new Date().toISOString() })
        .eq('id', alert_id)
        .eq('recepcion_id', recepcion_id)
    }

    await supabase.from('agent_logs').insert({
      agent_name: 'manual_action',
      accion:     resolution === 'accept' ? 'STOCK_ACEPTADO' : 'STOCK_RECHAZADO',
      payload:    { recepcion_id, alert_id, resolution, by: user.email },
      resultado:  'SUCCESS',
    })

    return NextResponse.json({ success: true, action: `stock_${resolution}` })
  } catch (err) {
    return safeError(err, 'accept-stock')
  }
})
