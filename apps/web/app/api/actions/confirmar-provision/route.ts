import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/supabase'
import { z } from 'zod/v4'
import { withRole, readJsonBody, type AuthUser } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'
import { safeError } from '@/lib/errors'

const Schema = z.object({
  provision_id: z.string().uuid(),
  fecha_pago:   z.string().date(),
  alert_id:     z.string().uuid().optional(),
})


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

  const { provision_id, fecha_pago, alert_id } = parsed.data
  const supabase = db

  try {
    const { data: provision, error } = await supabase
      .from('provisiones_fondos')
      .update({ estado: 'PAGADO', paid_at: new Date(fecha_pago).toISOString() })
      .eq('id', provision_id)
      .select('remesa_id')
      .single()

    if (error) throw error

    if (provision?.remesa_id) {
      await supabase
        .from('remesas')
        .update({ estado: 'EN_ADUANA', updated_at: new Date().toISOString() })
        .eq('id', provision.remesa_id)
        .in('estado', ['PROVISION_RECIBIDA', 'PAGO_COMPLETO'])
    }

    if (alert_id) {
      await supabase
        .from('alertas')
        .update({ leida: true, leida_at: new Date().toISOString() })
        .eq('id', alert_id)
    }

    await supabase.from('agent_logs').insert({
      agent_name: 'manual_action',
      remesa_id:  provision?.remesa_id ?? null,
      accion:     'PROVISION_CONFIRMADA',
      payload:    { provision_id, fecha_pago, by: user.email },
      resultado:  'SUCCESS',
    })

    return NextResponse.json({ success: true, action: 'provision_confirmada' })
  } catch (err) {
    return safeError(err, 'confirmar-provision')
  }
})
