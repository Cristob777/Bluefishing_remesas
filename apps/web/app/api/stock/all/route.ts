import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthUser } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'

export const GET = withAuth(async (req: NextRequest, user: AuthUser) => {
  const limited = rateLimit(req, 'read', user.id)
  if (limited) return limited

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const { data, error } = await supabase
      .from('stock_recepciones')
      .select('*, items:stock_items(*), remesa:remesas(numero_invoice, proveedor:proveedores(nombre))')
      .order('fecha_recepcion', { ascending: false })
      .limit(50)

    if (error) return NextResponse.json({ error: error.message, recepciones: [] }, { status: 500 })

    return NextResponse.json({ recepciones: data ?? [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message, recepciones: [] }, { status: 500 })
  }
})
