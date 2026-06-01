import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/supabase'
import { z } from 'zod/v4'
import { withAuth, readJsonBody, type AuthUser } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'
import { safeError } from '@/lib/errors'

const Schema = z.object({
  alert_id: z.string().uuid(),
  action:   z.enum(['dismiss', 'escalate']),
})


export const POST = withAuth(async (req: NextRequest, user: AuthUser) => {
  const limited = rateLimit(req, 'action', user.id)
  if (limited) return limited

  let body: unknown
  try {
    body = await readJsonBody(req, 10_000)
  } catch {
    return NextResponse.json({ error: 'Invalid or oversized request' }, { status: 400 })
  }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.issues.map(i => i.message) },
      { status: 400 },
    )
  }

  const { alert_id, action } = parsed.data
  const supabase = db

  try {
    if (action === 'dismiss') {
      const { error } = await supabase
        .from('alertas')
        .update({ leida: true, leida_at: new Date().toISOString() })
        .eq('id', alert_id)

      if (error) throw error
      return NextResponse.json({ success: true, action: 'dismissed' })
    }

    // escalate
    await supabase
      .from('alertas')
      .update({ leida: true, leida_at: new Date().toISOString() })
      .eq('id', alert_id)

    const { error } = await supabase.from('alertas').insert({
      tipo:         'APROBACION_REQUERIDA',
      mensaje:      `Escalado manualmente desde alerta ${alert_id} por ${user.email}`,
      urgente:      true,
      destinatario: 'gerente',
    })

    if (error) throw error
    return NextResponse.json({ success: true, action: 'escalated' })
  } catch (err) {
    return safeError(err, 'resolve-alert')
  }
})
