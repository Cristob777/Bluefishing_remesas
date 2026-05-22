import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { withRole, readJsonBody, type AuthUser } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'
import { safeError } from '@/lib/errors'

const ResolutionSchema = z.object({
  recepcion_id: z.string().uuid(),
  alert_id:     z.string().uuid().optional(),
  resolution:   z.enum(['accept', 'reject']),
})

const CountSchema = z.object({
  recepcion_id: z.string().uuid(),
  remesa_id:    z.string().uuid(),
  quantities:   z.record(z.string(), z.coerce.number().int().nonnegative()),
})

const Schema = z.union([ResolutionSchema, CountSchema])

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export const POST = withRole(['warehouse', 'owner', 'finance'], async (req: NextRequest, user: AuthUser) => {
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

  const supabase = sb()

  if ('quantities' in parsed.data) {
    const { recepcion_id, remesa_id, quantities } = parsed.data

    try {
      const { data: items, error: itemsError } = await supabase
        .from('stock_items')
        .select('id, cantidad_invoice')
        .eq('recepcion_id', recepcion_id)
        .eq('remesa_id', remesa_id)

      if (itemsError) throw itemsError
      if (!items?.length) {
        return NextResponse.json({ error: 'No stock items found for this reception' }, { status: 404 })
      }

      const missing = items.filter(item => quantities[item.id] === undefined)
      if (missing.length > 0) {
        return NextResponse.json({ error: 'Missing received quantity for one or more SKUs' }, { status: 400 })
      }

      const updates = await Promise.all(items.map(item =>
        supabase
          .from('stock_items')
          .update({ cantidad_recibida: quantities[item.id] })
          .eq('id', item.id)
          .eq('recepcion_id', recepcion_id)
      ))

      const updateError = updates.find(r => r.error)?.error
      if (updateError) throw updateError

      const hasDifferences = items.some(item => quantities[item.id] !== item.cantidad_invoice)
      const newEstado = hasDifferences ? 'CON_DIFERENCIAS' : 'CONTADO'

      const { error: recError } = await supabase
        .from('stock_recepciones')
        .update({ estado: newEstado })
        .eq('id', recepcion_id)
        .eq('remesa_id', remesa_id)

      if (recError) throw recError

      if (hasDifferences) {
        await supabase.from('alertas').insert({
          remesa_id,
          tipo:         'DIFERENCIA_STOCK',
          mensaje:      'Diferencias de stock detectadas en conteo de bodega. Revisar con proveedor.',
          urgente:      false,
          destinatario: 'owner',
        })
      }

      await supabase
        .from('remesas')
        .update({ estado: 'MERCADERIA_RECIBIDA', updated_at: new Date().toISOString() })
        .eq('id', remesa_id)
        .in('estado', ['EN_ADUANA', 'PROVISION_RECIBIDA'])

      await supabase.from('agent_logs').insert({
        agent_name: 'manual_action',
        remesa_id,
        accion:     'STOCK_CONTEO_REGISTRADO',
        payload:    { recepcion_id, quantities, has_differences: hasDifferences, by: user.email },
        resultado:  'SUCCESS',
      })

      return NextResponse.json({ success: true, action: 'stock_counted', has_differences: hasDifferences })
    } catch (err) {
      return safeError(err, 'accept-stock')
    }
  }

  const { recepcion_id, alert_id, resolution } = parsed.data
  const newEstado = resolution === 'accept' ? 'INGRESADO_BSALE' : 'CON_DIFERENCIAS'

  try {
    const { data: recepcion, error } = await supabase
      .from('stock_recepciones')
      .update({
        estado:             newEstado,
        ingresado_bsale_at: resolution === 'accept' ? new Date().toISOString() : null,
      })
      .eq('id', recepcion_id)
      .select('remesa_id')
      .single()

    if (error) throw error

    if (alert_id) {
      await supabase
        .from('alertas')
        .update({ leida: true, leida_at: new Date().toISOString() })
        .eq('id', alert_id)
    }

    await supabase.from('agent_logs').insert({
      agent_name: 'manual_action',
      remesa_id:  recepcion?.remesa_id ?? null,
      accion:     resolution === 'accept' ? 'STOCK_ACEPTADO' : 'STOCK_RECHAZADO',
      payload:    { recepcion_id, alert_id, resolution, by: user.email },
      resultado:  'SUCCESS',
    })

    return NextResponse.json({ success: true, action: `stock_${resolution}` })
  } catch (err) {
    return safeError(err, 'accept-stock')
  }
})
