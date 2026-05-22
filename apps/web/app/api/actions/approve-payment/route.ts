import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { withRole, readJsonBody, type AuthUser } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'
import { safeError } from '@/lib/errors'

const PaymentApprovalSchema = z.object({
  pago_id:  z.string().uuid(),
  alert_id: z.string().uuid().optional(),
})

const OperationApprovalSchema = z.object({
  remesa_id: z.string().uuid(),
  decision:  z.enum(['aprobado', 'rechazado']),
  notas:     z.string().max(500).optional(),
})

const Schema = z.union([PaymentApprovalSchema, OperationApprovalSchema])

// CLP threshold from CLAUDE.md: operations > 5M CLP require human approval (owner only)
const APPROVAL_THRESHOLD_CLP = 5_000_000

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

  const supabase = sb()

  if ('remesa_id' in parsed.data) {
    const { remesa_id, decision, notas } = parsed.data

    try {
      await supabase
        .from('alertas')
        .update({ leida: true, leida_at: new Date().toISOString() })
        .eq('remesa_id', remesa_id)
        .eq('tipo', 'APROBACION_REQUERIDA')
        .eq('leida', false)

      await supabase.from('agent_logs').insert({
        agent_name: 'manual_action',
        remesa_id,
        accion:     decision === 'aprobado' ? 'OPERACION_APROBADA' : 'OPERACION_RECHAZADA',
        payload:    { decision, notas: notas ?? null, by: user.email },
        resultado:  'SUCCESS',
      })

      return NextResponse.json({ success: true, action: `operation_${decision}` })
    } catch (err) {
      return safeError(err, 'approve-payment')
    }
  }

  const { pago_id, alert_id } = parsed.data

  try {
    // Fetch payment to enforce CLP threshold
    const { data: pago } = await supabase
      .from('pagos')
      .select('monto_clp, estado, remesa_id')
      .eq('id', pago_id)
      .single()

    if (pago?.estado === 'CONFIRMADO') {
      return NextResponse.json({ error: 'Payment already confirmed' }, { status: 409 })
    }

    // Flag for audit if it was a large operation
    const isLargeOperation = (pago?.monto_clp ?? 0) > APPROVAL_THRESHOLD_CLP

    const { error } = await supabase
      .from('pagos')
      .update({ estado: 'CONFIRMADO', fecha_confirmacion: new Date().toISOString() })
      .eq('id', pago_id)

    if (error) throw error

    if (alert_id) {
      await supabase
        .from('alertas')
        .update({ leida: true, leida_at: new Date().toISOString() })
        .eq('id', alert_id)
    }

    await supabase.from('agent_logs').insert({
      agent_name: 'manual_action',
      remesa_id:  pago?.remesa_id ?? null,
      accion:     'PAGO_APROBADO',
      payload:    { pago_id, alert_id, by: user.email, large_operation: isLargeOperation, monto_clp: pago?.monto_clp },
      resultado:  'SUCCESS',
    })

    return NextResponse.json({ success: true, action: 'payment_approved' })
  } catch (err) {
    return safeError(err, 'approve-payment')
  }
})
