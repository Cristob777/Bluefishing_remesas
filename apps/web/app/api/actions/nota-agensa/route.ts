import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/supabase'
import { z } from 'zod/v4'
import { withRole, readJsonBody, type AuthUser } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'
import { safeError } from '@/lib/errors'

const Schema = z.object({
  remesa_id:      z.string().uuid(),
  alert_id:       z.string().uuid().optional(),
  tipo_nota:      z.enum(['NOTA_CREDITO', 'NOTA_DEBITO']),
  numero_nota:    z.string().trim().min(1).max(80),
  monto_clp:      z.coerce.number().int().positive(),
  fecha_emision:  z.string().date(),
  modalidad:      z.enum(['DEVOLUCION', 'CREDITO_PROXIMA_PROVISION', 'COMPENSACION', 'OTRO']).optional(),
  notas:          z.string().max(500).optional(),
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

  const {
    remesa_id,
    alert_id,
    tipo_nota,
    numero_nota,
    monto_clp,
    fecha_emision,
    modalidad,
    notas,
  } = parsed.data

  const supabase = db

  try {
    const { data: remesa } = await supabase
      .from('remesas')
      .select('id, estado, numero_invoice')
      .eq('id', remesa_id)
      .single()

    if (!remesa) {
      return NextResponse.json({ error: 'Remesa no encontrada' }, { status: 404 })
    }

    const { data: documento, error: docError } = await supabase
      .from('documentos')
      .insert({
        remesa_id,
        tipo:   tipo_nota,
        numero: numero_nota,
        monto:  monto_clp,
        moneda: 'CLP',
        fecha:  fecha_emision,
      })
      .select('id')
      .single()

    if (docError) throw docError

    const { data: provision } = await supabase
      .from('provisiones_fondos')
      .select('id')
      .eq('remesa_id', remesa_id)
      .eq('estado', 'PAGADO')
      .order('paid_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (provision?.id) {
      await supabase
        .from('provisiones_fondos')
        .update({
          nota_debito_numero:  numero_nota,
          monto_devolucion_clp: monto_clp,
          nota_debito_fecha:    fecha_emision,
        })
        .eq('id', provision.id)
    }

    await supabase
      .from('remesas')
      .update({ estado: 'RECONCILIADO', updated_at: new Date().toISOString() })
      .eq('id', remesa_id)

    if (alert_id) {
      await supabase
        .from('alertas')
        .update({ leida: true, leida_at: new Date().toISOString() })
        .eq('id', alert_id)
    }

    await supabase
      .from('alertas')
      .update({ leida: true, leida_at: new Date().toISOString() })
      .eq('remesa_id', remesa_id)
      .eq('tipo', 'SALDO_FAVOR_AGENSA')
      .eq('leida', false)

    await supabase.from('agent_logs').insert({
      agent_name: 'manual_action',
      remesa_id,
      accion:     'NOTA_AGENSA_REGISTRADA',
      payload:    {
        documento_id: documento?.id ?? null,
        tipo_nota,
        numero_nota,
        monto_clp,
        fecha_emision,
        modalidad: modalidad ?? null,
        notas: notas ?? null,
        previous_estado: remesa.estado,
        by: user.email,
      },
      resultado:  'SUCCESS',
    })

    return NextResponse.json({ success: true, action: 'nota_agensa_registrada' })
  } catch (err) {
    return safeError(err, 'nota-agensa')
  }
})
