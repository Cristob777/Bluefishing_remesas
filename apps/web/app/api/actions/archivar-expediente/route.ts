import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { remesa_id, checklist_completado, notas_cierre } = await req.json()

    if (!remesa_id || !checklist_completado) {
      return NextResponse.json(
        { error: 'remesa_id y checklist_completado son requeridos' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verificar que la remesa esté en estado RECONCILIADO
    const { data: remesa } = await supabase
      .from('remesas')
      .select('estado, numero_invoice')
      .eq('id', remesa_id)
      .single()

    if (remesa && remesa.estado !== 'RECONCILIADO') {
      return NextResponse.json(
        { error: `La remesa debe estar en estado RECONCILIADO para archivar. Estado actual: ${remesa.estado}` },
        { status: 422 }
      )
    }

    // Registrar documento de cierre
    await supabase.from('documentos').insert({
      remesa_id,
      tipo:   'OTRO',
      numero: `CIERRE-${remesa?.numero_invoice}-${new Date().toISOString().split('T')[0]}`,
      fecha:  new Date().toISOString().split('T')[0],
    })

    // Marcar todas las alertas de esta remesa como leídas
    await supabase
      .from('alertas')
      .update({ leida: true, leida_at: new Date().toISOString() })
      .eq('remesa_id', remesa_id)
      .eq('leida', false)

    await supabase.from('agent_logs').insert({
      agent_name: 'manual_action',
      remesa_id,
      accion:    'EXPEDIENTE_ARCHIVADO',
      payload:   { checklist_completado, notas_cierre },
      resultado: 'SUCCESS',
    })

    return NextResponse.json({ success: true, action: 'expediente_archivado' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
