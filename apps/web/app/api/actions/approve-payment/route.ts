import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { pago_id, alert_id } = await req.json()

    if (!pago_id) {
      return NextResponse.json({ error: 'pago_id is required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Update payment status to confirmed
    const { error } = await supabase
      .from('pagos')
      .update({
        estado: 'CONFIRMADO',
        fecha_confirmacion: new Date().toISOString(),
      })
      .eq('id', pago_id)

    if (error) throw error

    // Mark related alert as read if provided
    if (alert_id) {
      await supabase
        .from('alertas')
        .update({ leida: true, leida_at: new Date().toISOString() })
        .eq('id', alert_id)
    }

    // Log the action
    try {
      await supabase.from('agent_logs').insert({
        agent_name: 'manual_action',
        accion: 'PAGO_APROBADO',
        payload: { pago_id, alert_id },
        resultado: 'SUCCESS',
      })
    } catch { /* ignore logging errors */ }

    return NextResponse.json({ success: true, action: 'payment_approved' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
