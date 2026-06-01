import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/supabase'
import { z } from 'zod/v4'
import { withRole, readJsonBody, type AuthUser } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'
import { safeError } from '@/lib/errors'

const Schema = z.object({
  remesa_id:              z.string().uuid(),
  numero_despacho:        z.string().regex(/^DSP-\d{2}-\d{4,}$/i, 'Formato inválido — use DSP-AÑO-NNNN'),
  fecha_estimada_llegada: z.string().date().optional(),
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

  const { remesa_id, numero_despacho, fecha_estimada_llegada } = parsed.data
  const despacho = numero_despacho.trim().toUpperCase()
  const supabase = db

  try {
    // Enforce uniqueness — despacho cannot belong to another remesa
    const { data: existing } = await supabase
      .from('remesas')
      .select('id, numero_invoice')
      .eq('numero_despacho', despacho)
      .neq('id', remesa_id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: `El despacho ${despacho} ya está asignado a invoice ${existing.numero_invoice}` },
        { status: 409 },
      )
    }

    const { error } = await supabase
      .from('remesas')
      .update({
        numero_despacho: despacho,
        estado:          'EN_ADUANA',
        notas:           fecha_estimada_llegada ? `Llegada estimada: ${fecha_estimada_llegada}` : undefined,
        updated_at:      new Date().toISOString(),
      })
      .eq('id', remesa_id)

    if (error) throw error

    await supabase.from('agent_logs').insert({
      agent_name: 'manual_action',
      remesa_id,
      accion:     'DESPACHO_VINCULADO',
      payload:    { numero_despacho: despacho, fecha_estimada_llegada, by: user.email },
      resultado:  'SUCCESS',
    })

    return NextResponse.json({ success: true, numero_despacho: despacho })
  } catch (err) {
    return safeError(err, 'vincular-despacho')
  }
})
