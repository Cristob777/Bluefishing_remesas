import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { alert_id, action } = await req.json()

    if (!alert_id || !action) {
      return NextResponse.json({ error: 'alert_id and action are required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    if (action === 'dismiss') {
      const { error } = await supabase
        .from('alertas')
        .update({ leida: true, leida_at: new Date().toISOString() })
        .eq('id', alert_id)

      if (error) throw error
      return NextResponse.json({ success: true, action: 'dismissed' })
    }

    if (action === 'escalate') {
      // Mark original as read
      await supabase
        .from('alertas')
        .update({ leida: true, leida_at: new Date().toISOString() })
        .eq('id', alert_id)

      // Create escalation alert
      const { error } = await supabase.from('alertas').insert({
        tipo: 'APROBACION_REQUERIDA',
        mensaje: `Escalado manualmente desde alerta ${alert_id}`,
        urgente: true,
        destinatario: 'gerente',
      })

      if (error) throw error
      return NextResponse.json({ success: true, action: 'escalated' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
