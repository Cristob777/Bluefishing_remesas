import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { remesa_id, invoice, proveedor, texto_reclamo, diferencias } = await req.json()

    if (!remesa_id || !texto_reclamo) {
      return NextResponse.json(
        { error: 'remesa_id y texto_reclamo son requeridos' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Registrar el reclamo como documento
    const { data: doc, error: docError } = await supabase
      .from('documentos')
      .insert({
        remesa_id,
        tipo:   'OTRO',
        numero: `RECLAMO-${invoice}-${Date.now()}`,
        fecha:  new Date().toISOString().split('T')[0],
      })
      .select('id')
      .single()

    if (docError) throw docError

    // Crear alerta de seguimiento
    await supabase.from('alertas').insert({
      remesa_id,
      tipo:        'DIFERENCIA_STOCK',
      mensaje:     `Reclamo enviado a ${proveedor} — Invoice ${invoice}. ${texto_reclamo.substring(0, 100)}`,
      urgente:     false,
      destinatario: 'sebastian',
    })

    await supabase.from('agent_logs').insert({
      agent_name: 'manual_action',
      remesa_id,
      accion:    'RECLAMO_PROVEEDOR_CREADO',
      payload:   { invoice, proveedor, diferencias, texto_reclamo, documento_id: doc?.id },
      resultado: 'SUCCESS',
    })

    return NextResponse.json({ success: true, documento_id: doc?.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
