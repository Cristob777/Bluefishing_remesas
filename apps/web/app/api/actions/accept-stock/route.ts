import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { recepcion_id, alert_id, resolution } = await req.json()

    if (!recepcion_id) {
      return NextResponse.json({ error: 'recepcion_id is required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Accept differences and mark as ingested
    const newEstado = resolution === 'accept' ? 'INGRESADO_BSALE' : 'CON_DIFERENCIAS'

    const { error } = await supabase
      .from('stock_recepciones')
      .update({
        estado: newEstado,
        ingresado_bsale_at: resolution === 'accept' ? new Date().toISOString() : null,
      })
      .eq('id', recepcion_id)

    if (error) throw error

    // Mark related alert as read
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
        accion: resolution === 'accept' ? 'STOCK_ACEPTADO' : 'STOCK_RECHAZADO',
        payload: { recepcion_id, alert_id, resolution },
        resultado: 'SUCCESS',
      })
    } catch { /* ignore logging errors */ }

    return NextResponse.json({ success: true, action: `stock_${resolution}` })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
