import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/supabase'
import { z } from 'zod/v4'
import { withRole, readJsonBody, type AuthUser } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'
import { safeError } from '@/lib/errors'

const Schema = z.object({
  remesa_id:            z.string().uuid(),
  checklist_completado: z.boolean(),
  notas_cierre:         z.string().max(500).optional(),
})


export const POST = withRole(['finance', 'owner'], async (req: NextRequest, user: AuthUser) => {
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

  const { remesa_id, checklist_completado, notas_cierre } = parsed.data

  if (!checklist_completado) {
    return NextResponse.json({ error: 'El checklist debe estar completado antes de archivar' }, { status: 422 })
  }

  const supabase = db

  try {
    const { data: remesa } = await supabase
      .from('remesas')
      .select('estado, numero_invoice')
      .eq('id', remesa_id)
      .single()

    if (remesa && remesa.estado !== 'RECONCILIADO') {
      return NextResponse.json(
        { error: `La remesa debe estar en estado RECONCILIADO. Estado actual: ${remesa.estado}` },
        { status: 422 },
      )
    }

    await supabase.from('documentos').insert({
      remesa_id,
      tipo:   'OTRO',
      numero: `CIERRE-${remesa?.numero_invoice}-${new Date().toISOString().split('T')[0]}`,
      fecha:  new Date().toISOString().split('T')[0],
    })

    await supabase
      .from('alertas')
      .update({ leida: true, leida_at: new Date().toISOString() })
      .eq('remesa_id', remesa_id)
      .eq('leida', false)

    await supabase.from('agent_logs').insert({
      agent_name: 'manual_action',
      remesa_id,
      accion:     'EXPEDIENTE_ARCHIVADO',
      payload:    { checklist_completado, notas_cierre, by: user.email },
      resultado:  'SUCCESS',
    })

    return NextResponse.json({ success: true, action: 'expediente_archivado' })
  } catch (err) {
    return safeError(err, 'archivar-expediente')
  }
})
