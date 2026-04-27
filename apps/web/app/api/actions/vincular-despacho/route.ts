import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { remesa_id, numero_despacho, fecha_estimada_llegada } = await req.json()

    if (!remesa_id || !numero_despacho) {
      return NextResponse.json(
        { error: 'remesa_id y numero_despacho son requeridos' },
        { status: 400 }
      )
    }

    // Validar formato básico DSP-XX-XXXX
    if (!/^DSP-\d{2}-\d{4,}$/i.test(numero_despacho.trim())) {
      return NextResponse.json(
        { error: 'Formato inválido. Use: DSP-26-XXXX' },
        { status: 422 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verificar que el despacho no esté ya en uso por otra remesa
    const { data: existing } = await supabase
      .from('remesas')
      .select('id, numero_invoice')
      .eq('numero_despacho', numero_despacho.trim().toUpperCase())
      .neq('id', remesa_id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: `El despacho ${numero_despacho} ya está asignado a invoice ${existing.numero_invoice}` },
        { status: 409 }
      )
    }

    const { error } = await supabase
      .from('remesas')
      .update({
        numero_despacho: numero_despacho.trim().toUpperCase(),
        estado:         'EN_ADUANA',
        notas:          fecha_estimada_llegada
          ? `Llegada estimada: ${fecha_estimada_llegada}`
          : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', remesa_id)

    if (error) throw error

    await supabase.from('agent_logs').insert({
      agent_name: 'manual_action',
      remesa_id,
      accion:    'DESPACHO_VINCULADO',
      payload:   { numero_despacho, fecha_estimada_llegada },
      resultado: 'SUCCESS',
    })

    return NextResponse.json({ success: true, numero_despacho: numero_despacho.trim().toUpperCase() })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
