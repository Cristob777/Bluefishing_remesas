import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { createClient } from '@supabase/supabase-js'
import { withAuth, withRole, readJsonBody, type AuthUser } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const CreateRemesaSchema = z.object({
  numero_invoice:    z.string().min(1).max(100),
  proveedor_id:      z.string().uuid(),
  monto_total:       z.number().positive(),
  moneda:            z.enum(['USD', 'JPY', 'EUR', 'CNY', 'CNH', 'CLP']),
  fecha_invoice:     z.string().date(),
  condicion_pago:    z.string().max(100).optional(),
  notas:             z.string().max(500).optional(),
})

export const GET = withAuth(async (req: NextRequest, user: AuthUser) => {
  const limited = rateLimit(req, 'read', user.id)
  if (limited) return limited

  const { searchParams } = new URL(req.url)
  const estado = searchParams.get('estado')
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)

  const supabase = sb()
  let query = supabase
    .from('remesas')
    .select(`
      *,
      proveedor:proveedores(nombre, pais, moneda),
      pagos(*),
      alertas(id, tipo, urgente, leida)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  // Only allow known estado values to prevent injection
  const VALID_ESTADOS = ['INVOICE_RECIBIDO','PAGO_PENDIENTE','PAGO_COMPLETO','EN_ADUANA','RECIBIDO','RECONCILIADO']
  if (estado && VALID_ESTADOS.includes(estado)) {
    query = query.eq('estado', estado)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ remesas: data })
})

export const POST = withRole(['owner'], async (req: NextRequest, user: AuthUser) => {
  const limited = rateLimit(req, 'action', user.id)
  if (limited) return limited

  let body: unknown
  try {
    body = await readJsonBody(req, 10_000)
  } catch {
    return NextResponse.json({ error: 'Invalid or oversized request' }, { status: 400 })
  }

  const parsed = CreateRemesaSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.issues.map(i => i.message) },
      { status: 400 },
    )
  }

  const supabase = sb()
  const { data, error } = await supabase
    .from('remesas')
    .insert({ ...parsed.data, estado: 'INVOICE_RECIBIDO' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await supabase.from('agent_logs').insert({
    agent_name: 'manual_action',
    remesa_id:  data.id,
    accion:     'REMESA_CREATED_MANUAL',
    payload:    { ...parsed.data, by: user.email },
    resultado:  'SUCCESS',
  })

  return NextResponse.json({ remesa: data }, { status: 201 })
})
