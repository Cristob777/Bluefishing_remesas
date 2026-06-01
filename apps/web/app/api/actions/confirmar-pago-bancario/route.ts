import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/supabase'
import { z } from 'zod/v4'
import { withRole, readJsonBody, type AuthUser } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'
import { safeError } from '@/lib/errors'

const Schema = z.object({
  pago_id:            z.string().uuid(),
  remesa_id:          z.string().uuid().optional(),
  referencia_swift:   z.string().min(1).max(50),
  fecha_confirmacion: z.string().date(),
  idempotency_key:    z.string().min(8).max(100).optional(),
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

  const { pago_id, remesa_id, referencia_swift, fecha_confirmacion, idempotency_key } = parsed.data
  const supabase = db

  try {
    // Idempotency: check if already confirmed to prevent duplicate wire transfers
    const { data: existing } = await supabase
      .from('pagos')
      .select('id, estado, fx_fecha, remesa_id')
      .eq('id', pago_id)
      .single()

    if (existing?.estado === 'CONFIRMADO') {
      return NextResponse.json({
        success: true,
        action: 'pago_confirmado',
        cached: true,
        fx_fecha: existing.fx_fecha,
      })
    }

    const { data: pago, error } = await supabase
      .from('pagos')
      .update({
        estado: 'CONFIRMADO',
        fecha_confirmacion,
        fx_fecha: fecha_confirmacion,
        orden_pago_numero: referencia_swift,
      })
      .eq('id', pago_id)
      .select('remesa_id, moneda, monto_moneda_origen, tipo')
      .single()

    if (error) throw error

    const rid = remesa_id ?? pago?.remesa_id ?? existing?.remesa_id
    if (rid) {
      const { data: pendientes } = await supabase
        .from('pagos')
        .select('id')
        .eq('remesa_id', rid)
        .in('estado', ['PENDIENTE', 'EMITIDO'])

      if (pendientes?.length === 0) {
        await supabase
          .from('remesas')
          .update({ estado: 'PAGO_COMPLETO', updated_at: new Date().toISOString() })
          .eq('id', rid)
      }
    }

    await supabase.from('agent_logs').insert({
      agent_name: 'manual_action',
      remesa_id:  rid ?? null,
      accion:     'PAGO_BANCARIO_CONFIRMADO',
      payload:    {
        pago_id,
        referencia_swift,
        fecha_confirmacion,
        by: user.email,
        idempotency_key: idempotency_key ?? null,
        estado_antes: existing?.estado ?? 'EMITIDO',
      },
      resultado:  'SUCCESS',
    })

    return NextResponse.json({ success: true, action: 'pago_confirmado', fx_fecha: fecha_confirmacion })
  } catch (err) {
    return safeError(err, 'confirmar-pago-bancario')
  }
})
