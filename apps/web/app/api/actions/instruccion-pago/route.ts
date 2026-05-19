import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { withRole, readJsonBody, type AuthUser } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'

const Schema = z.object({
  remesa_id:      z.string().uuid(),
  condicion_pago: z.string().min(1).max(100),
  anticipo_pct:   z.number().min(0).max(100),
  monto_anticipo: z.number().positive(),
  monto_saldo:    z.number().min(0),
  moneda:         z.enum(['USD', 'JPY', 'EUR', 'CNY', 'CNH', 'CLP']),
  notas:          z.string().max(500).optional(),
})

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export const POST = withRole(['owner'], async (req: NextRequest, user: AuthUser) => {
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

  const { remesa_id, condicion_pago, anticipo_pct, monto_anticipo, monto_saldo, moneda, notas } = parsed.data
  const supabase = sb()

  try {
    const pagosToInsert = anticipo_pct < 100
      ? [
          { remesa_id, tipo: 'ANTICIPO', monto_moneda_origen: monto_anticipo, moneda, estado: 'PENDIENTE', created_by: user.email },
          { remesa_id, tipo: 'SALDO',    monto_moneda_origen: monto_saldo,    moneda, estado: 'PENDIENTE', created_by: user.email },
        ]
      : [
          { remesa_id, tipo: 'UNICO', monto_moneda_origen: monto_anticipo, moneda, estado: 'PENDIENTE', created_by: user.email },
        ]

    const { data: pagos, error: pagosError } = await supabase
      .from('pagos')
      .insert(pagosToInsert)
      .select('id, tipo')

    if (pagosError) throw pagosError

    await supabase
      .from('remesas')
      .update({ condicion_pago, notas: notas ?? null, estado: 'PAGO_PENDIENTE', updated_at: new Date().toISOString() })
      .eq('id', remesa_id)

    await supabase.from('alertas').insert({
      remesa_id,
      tipo:         'PAGO_PENDIENTE',
      mensaje:      `Instrucción de pago recibida — condición ${condicion_pago}. ${notas ?? ''}`.trim(),
      urgente:      false,
      destinatario: 'finance',
    })

    await supabase.from('agent_logs').insert({
      agent_name: 'manual_action',
      remesa_id,
      accion:     'INSTRUCCION_PAGO_DEFINIDA',
      payload:    { condicion_pago, anticipo_pct, monto_anticipo, monto_saldo, moneda, by: user.email },
      resultado:  'SUCCESS',
    })

    return NextResponse.json({ success: true, pagos })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
})
