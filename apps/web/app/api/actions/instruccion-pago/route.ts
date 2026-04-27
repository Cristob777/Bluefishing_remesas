import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { remesa_id, condicion_pago, anticipo_pct, monto_anticipo, monto_saldo, moneda, notas } =
      await req.json()

    if (!remesa_id || !condicion_pago || anticipo_pct == null) {
      return NextResponse.json({ error: 'remesa_id, condicion_pago y anticipo_pct son requeridos' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const pagosToInsert = []

    if (anticipo_pct < 100) {
      // Anticipo
      pagosToInsert.push({
        remesa_id,
        tipo: 'ANTICIPO',
        monto_moneda_origen: monto_anticipo,
        moneda,
        estado: 'PENDIENTE',
        created_by: 'sebastian',
      })
      // Saldo
      pagosToInsert.push({
        remesa_id,
        tipo: 'SALDO',
        monto_moneda_origen: monto_saldo,
        moneda,
        estado: 'PENDIENTE',
        created_by: 'sebastian',
      })
    } else {
      // Pago único
      pagosToInsert.push({
        remesa_id,
        tipo: 'UNICO',
        monto_moneda_origen: monto_anticipo,
        moneda,
        estado: 'PENDIENTE',
        created_by: 'sebastian',
      })
    }

    const { data: pagos, error: pagosError } = await supabase
      .from('pagos')
      .insert(pagosToInsert)
      .select('id, tipo')

    if (pagosError) throw pagosError

    // Actualizar remesa: guardar condicion_pago y notas, avanzar estado
    await supabase
      .from('remesas')
      .update({
        condicion_pago,
        notas: notas || null,
        estado: 'PAGO_PENDIENTE',
        updated_at: new Date().toISOString(),
      })
      .eq('id', remesa_id)

    // Alerta para Hector
    await supabase.from('alertas').insert({
      remesa_id,
      tipo: 'PAGO_PENDIENTE',
      mensaje: `Instrucción de pago recibida — condición ${condicion_pago}. ${notas ?? ''}`.trim(),
      urgente: false,
      destinatario: 'hector',
    })

    await supabase.from('agent_logs').insert({
      agent_name: 'manual_action',
      remesa_id,
      accion: 'INSTRUCCION_PAGO_DEFINIDA',
      payload: { condicion_pago, anticipo_pct, monto_anticipo, monto_saldo, moneda },
      resultado: 'SUCCESS',
    })

    return NextResponse.json({ success: true, pagos })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
