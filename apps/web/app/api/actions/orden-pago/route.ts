import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { pago_id, numero_orden, fecha_emision, remesa_id } = await req.json()

    if (!pago_id || !numero_orden || !fecha_emision) {
      return NextResponse.json(
        { error: 'pago_id, numero_orden y fecha_emision son requeridos' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabase
      .from('pagos')
      .update({
        estado: 'EMITIDO',
        orden_pago_numero: numero_orden,
        fecha_emision,
        created_by: 'hector',
      })
      .eq('id', pago_id)

    if (error) throw error

    // Si todos los pagos PENDIENTE de la remesa pasaron a EMITIDO,
    // avanzar remesa a estado apropiado — lo hace la BD automáticamente
    // pero dejamos la lógica en el agente. Aquí solo logueamos.
    await supabase.from('agent_logs').insert({
      agent_name: 'manual_action',
      remesa_id: remesa_id ?? null,
      accion: 'ORDEN_PAGO_EMITIDA',
      payload: { pago_id, numero_orden, fecha_emision },
      resultado: 'SUCCESS',
    })

    return NextResponse.json({ success: true, action: 'orden_emitida' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
