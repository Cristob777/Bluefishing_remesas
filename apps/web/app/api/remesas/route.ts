import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const estado = searchParams.get('estado')
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)

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

  if (estado) query = query.eq('estado', estado)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ remesas: data })
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('remesas')
    .insert(body)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await supabase.from('agent_logs').insert({
    agent_name: 'invoice_intake',
    remesa_id:  data.id,
    accion:     'REMESA_CREATED_MANUAL',
    payload:    body,
    resultado:  'SUCCESS',
  })

  return NextResponse.json({ remesa: data }, { status: 201 })
}
