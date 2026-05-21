import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { withRole, readJsonBody, type AuthUser } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'
import { safeError } from '@/lib/errors'

const Schema = z.object({
  remesa_id:     z.string().uuid(),
  invoice:       z.string().max(100).optional(),
  proveedor:     z.string().max(200).optional(),
  texto_reclamo: z.string().min(10).max(2000),
  diferencias:   z.array(z.object({
    sku:      z.string().max(50),
    esperado: z.number().int().nonnegative(),
    recibido: z.number().int().nonnegative(),
  })).optional(),
})

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export const POST = withRole(['owner', 'finance'], async (req: NextRequest, user: AuthUser) => {
  const limited = rateLimit(req, 'action', user.id)
  if (limited) return limited

  let body: unknown
  try {
    body = await readJsonBody(req, 20_000)
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

  const { remesa_id, invoice, proveedor, texto_reclamo, diferencias } = parsed.data
  const supabase = sb()

  try {
    const { data: doc, error: docError } = await supabase
      .from('documentos')
      .insert({
        remesa_id,
        tipo:   'OTRO',
        numero: `RECLAMO-${invoice ?? remesa_id.slice(0, 8)}-${Date.now()}`,
        fecha:  new Date().toISOString().split('T')[0],
      })
      .select('id')
      .single()

    if (docError) throw docError

    await supabase.from('alertas').insert({
      remesa_id,
      tipo:         'DIFERENCIA_STOCK',
      mensaje:      `Reclamo enviado a ${proveedor ?? 'proveedor'} — Invoice ${invoice ?? '—'}. ${texto_reclamo.substring(0, 100)}`,
      urgente:      false,
      destinatario: 'owner',
    })

    await supabase.from('agent_logs').insert({
      agent_name: 'manual_action',
      remesa_id,
      accion:     'RECLAMO_PROVEEDOR_CREADO',
      payload:    { invoice, proveedor, diferencias, texto_reclamo, documento_id: doc?.id, by: user.email },
      resultado:  'SUCCESS',
    })

    return NextResponse.json({ success: true, documento_id: doc?.id })
  } catch (err) {
    return safeError(err, 'reclamo-proveedor')
  }
})
