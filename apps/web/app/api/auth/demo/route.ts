import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/supabase'

const DEMO_EMAIL = 'demo@bluefishing.cl'

export async function POST(req: NextRequest) {
  const origin = req.nextUrl.origin

  const { data, error } = await db.auth.admin.generateLink({
    type: 'magiclink',
    email: DEMO_EMAIL,
    options: { redirectTo: `${origin}/dashboard/overview` },
  })

  if (error || !data?.properties?.action_link) {
    return NextResponse.json(
      { error: error?.message ?? 'No se pudo generar el acceso demo' },
      { status: 500 },
    )
  }

  return NextResponse.json({ link: data.properties.action_link })
}
