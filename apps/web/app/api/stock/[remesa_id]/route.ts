import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withRole, type AuthUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

type Params = { params: Promise<{ remesa_id: string }> }

export const GET = withAuth(async (
  _req: NextRequest,
  _user: AuthUser,
  ctx: Params
) => {
  const { remesa_id } = await ctx.params

  const { data, error } = await supabase
    .from('stock_recepciones')
    .select('*, items:stock_items(*)')
    .eq('remesa_id', remesa_id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ recepciones: data })
})

interface StockItemInput {
  sku: string
  descripcion?: string
  cantidad_invoice: number
  cantidad_recibida: number
  precio_unitario_usd?: number
}

interface StockPostBody {
  fecha_recepcion?: string
  items?: StockItemInput[]
}

export const POST = withRole(['warehouse', 'owner', 'finance'], async (
  req: NextRequest,
  _user: AuthUser,
  ctx: Params
) => {
  const { remesa_id } = await ctx.params

  let body: StockPostBody
  try {
    body = (await req.json()) as StockPostBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { data: recepcion, error: recError } = await supabase
    .from('stock_recepciones')
    .insert({
      remesa_id,
      fecha_recepcion: body.fecha_recepcion ?? new Date().toISOString().split('T')[0],
      estado: 'CONTADO',
    })
    .select()
    .single()

  if (recError) return NextResponse.json({ error: recError.message }, { status: 400 })

  if (body.items && body.items.length > 0) {
    const items = body.items.map((item) => ({
      ...item,
      recepcion_id: recepcion.id,
      remesa_id,
    }))
    const { error: itemsError } = await supabase.from('stock_items').insert(items)
    if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 400 })
  }

  const hasDifferences = body.items?.some(
    (item) => item.cantidad_recibida !== item.cantidad_invoice
  ) ?? false

  if (hasDifferences) {
    await Promise.all([
      supabase.from('alertas').insert({
        remesa_id,
        tipo:         'DIFERENCIA_STOCK',
        mensaje:      `Diferencias de stock en recepción del ${body.fecha_recepcion ?? 'hoy'}. Revisar con proveedor.`,
        urgente:      false,
        destinatario: 'sebastian',
      }),
      supabase.from('stock_recepciones')
        .update({ estado: 'CON_DIFERENCIAS' })
        .eq('id', recepcion.id),
    ])
  }

  await supabase.from('remesas')
    .update({ estado: 'MERCADERIA_RECIBIDA' })
    .eq('id', remesa_id)
    .in('estado', ['EN_ADUANA', 'PROVISION_RECIBIDA'])

  await supabase.from('agent_logs').insert({
    agent_name: 'landed_cost',
    remesa_id,
    accion:     'STOCK_RECEPCION_CREATED',
    payload:    { recepcion_id: recepcion.id, has_differences: hasDifferences },
    resultado:  'SUCCESS',
  })

  return NextResponse.json({ recepcion }, { status: 201 })
})
