import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { pago_id, remesa_id, referencia_swift, fecha_confirmacion } = await req.json()

    if (!pago_id || !referencia_swift || !fecha_confirmacion) {
      return NextResponse.json(
        { error: 'pago_id, referencia_swift y fecha_confirmacion son requeridos' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Marcar pago como CONFIRMADO con la fecha real del banco
    // fx_fecha = fecha_confirmacion — es la fecha que usa landed_cost para el FX
    const { data: pago, error } = await supabase
      .from('pagos')
      .update({
        estado:             'CONFIRMADO',
        fecha_confirmacion: fecha_confirmacion,
        fx_fecha:           fecha_confirmacion,
        orden_pago_numero:  referencia_swift,
      })
      .eq('id', pago_id)
      .select('remesa_id, moneda, monto_moneda_origen, tipo')
      .single()

    if (error) throw error

    // Verificar si todos los pagos de la remesa están confirmados
    const rid = remesa_id ?? pago?.remesa_id
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
      payload:    { pago_id, referencia_swift, fecha_confirmacion },
      resultado:  'SUCCESS',
    })

    return NextResponse.json({ success: true, action: 'pago_confirmado', fx_fecha: fecha_confirmacion })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
