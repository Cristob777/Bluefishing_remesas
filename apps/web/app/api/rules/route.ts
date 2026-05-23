import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { createClient } from '@supabase/supabase-js'
import { withAuth, readJsonBody, type AuthUser } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const CreateReglaSchema = z.object({
  nombre:      z.string().min(1).max(200),
  descripcion: z.string().max(500).optional(),
  condiciones: z.array(z.object({
    campo:     z.string(),
    operador:  z.string(),
    valor:     z.string(),
  })).min(1),
  accion: z.object({
    tipo:       z.string(),
    parametros: z.record(z.string(), z.unknown()).optional(),
  }),
})

export const GET = withAuth(async (req: NextRequest, user: AuthUser) => {
  const limited = rateLimit(req, 'read', user.id)
  if (limited) return limited

  const { data, error } = await sb()
    .from('reglas')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
})

export const POST = withAuth(async (req: NextRequest, user: AuthUser) => {
  const limited = rateLimit(req, 'action', user.id)
  if (limited) return limited

  const body = await readJsonBody(req)
  const parsed = CreateReglaSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 })

  const { data, error } = await sb()
    .from('reglas')
    .insert({ ...parsed.data, creado_por: user.email ?? user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
})

export const PATCH = withAuth(async (req: NextRequest, user: AuthUser) => {
  const limited = rateLimit(req, 'action', user.id)
  if (limited) return limited

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const body = await readJsonBody(req)
  const { activa } = body as { activa?: boolean }
  if (activa === undefined) return NextResponse.json({ error: 'campo activa requerido' }, { status: 400 })

  const { data, error } = await sb()
    .from('reglas')
    .update({ activa, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
})
