import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { provision_id, fecha_pago } = await req.json()

    if (!provision_id || !fecha_pago) {
      return NextResponse.json(
        { error: 'provision_id y fecha_pago son requeridos' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: provision, error } = await supabase
      .from('provisiones_fondos')
      .update({
        estado: 'PAGADO',
        paid_at: new Date(fecha_pago).toISOString(),
      })
      .eq('id', provision_id)
      .select('remesa_id')
      .single()

    if (error) throw error

    // Actualizar remesa si aplica
    if (provision?.remesa_id) {
      await supabase
        .from('remesas')
        .update({ estado: 'EN_ADUANA', updated_at: new Date().toISOString() })
        .eq('id', provision.remesa_id)
        .in('estado', ['PROVISION_RECIBIDA', 'PAGO_COMPLETO'])
    }

    await supabase.from('agent_logs').insert({
      agent_name: 'manual_action',
      remesa_id: provision?.remesa_id ?? null,
      accion: 'PROVISION_CONFIRMADA',
      payload: { provision_id, fecha_pago },
      resultado: 'SUCCESS',
    })

    return NextResponse.json({ success: true, action: 'provision_confirmada' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
