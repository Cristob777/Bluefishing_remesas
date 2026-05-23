import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withAuth, type AuthUser } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export const GET = withAuth(async (req: NextRequest, user: AuthUser) => {
  const limited = rateLimit(req, 'read', user.id)
  if (limited) return limited

  const { searchParams } = new URL(req.url)
  const tipo  = searchParams.get('tipo')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)

  let q = sb()
    .from('documentos')
    .select('*, remesa:remesa_id(numero_invoice, proveedor:proveedores(nombre))')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (tipo) q = q.eq('tipo', tipo)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
})
