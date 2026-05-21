import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { withRole, readJsonBody, type AuthUser } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'
import { safeError } from '@/lib/errors'

const Schema = z.object({
  pago_id:       z.string().uuid(),
  numero_orden:  z.string().min(1).max(50),
  fecha_emision: z.string().date(),
  remesa_id:     z.string().uuid().optional(),
})

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export const POST = withRole(['finance', 'owner'], async (req: NextRequest, user: AuthUser) => {
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

  const { pago_id, numero_orden, fecha_emision, remesa_id } = parsed.data
  const supabase = sb()

  try {
    const { error } = await supabase
      .from('pagos')
      .update({ estado: 'EMITIDO', orden_pago_numero: numero_orden, fecha_emision, created_by: user.email })
      .eq('id', pago_id)

    if (error) throw error

    await supabase.from('agent_logs').insert({
      agent_name: 'manual_action',
      remesa_id:  remesa_id ?? null,
      accion:     'ORDEN_PAGO_EMITIDA',
      payload:    { pago_id, numero_orden, fecha_emision, by: user.email },
      resultado:  'SUCCESS',
    })

    return NextResponse.json({ success: true, action: 'orden_emitida' })
  } catch (err) {
    return safeError(err, 'orden-pago')
  }
})
