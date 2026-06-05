import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { db } from '@/lib/supabase'
import { triggerAgent, categoryToAgent } from '@/lib/managed-agents'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { DEMO_FIXTURES } from '@/lib/demo-fixtures'
import type { ClassifiedEmail } from '@/types'

const Schema = z.object({
  fixture_id: z.string().min(1).max(80),
})

export async function POST(req: NextRequest) {
  // Rate-limit — reuse existing 'action' preset (30/min per key)
  const ip      = getClientIp(req)
  const limited = rateLimit(req, 'action', `demo:${ip}`)
  if (limited) return limited

  let body: unknown
  try {
    const text = await req.text()
    if (text.length > 1_000) return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    body = JSON.parse(text)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'fixture_id is required' }, { status: 400 })
  }

  const fixture = DEMO_FIXTURES.find(f => f.id === parsed.data.fixture_id)
  if (!fixture) {
    return NextResponse.json(
      { error: `Unknown fixture: ${parsed.data.fixture_id}`, available: DEMO_FIXTURES.map(f => f.id) },
      { status: 404 },
    )
  }

  // Ensure the synthetic supplier exists in DB (idempotent, INVOICE only)
  if (fixture.category === 'INVOICE_PROVEEDOR' && fixture.supplierName) {
    const { data: existing } = await db
      .from('proveedores')
      .select('id')
      .ilike('nombre', fixture.supplierName)
      .limit(1)
      .maybeSingle()

    if (!existing) {
      await db.from('proveedores').insert({
        nombre:         fixture.supplierName,
        pais:           fixture.supplierCountry,
        moneda:         fixture.supplierCurrency,
        contacto_email: fixture.supplierEmail,
      })
    }
  }

  // Build ClassifiedEmail with pre-resolved category — no classifyEmail() call
  const classified: ClassifiedEmail = {
    ...fixture.payload,
    category:       fixture.category,
    confidence:     1.0,
    extracted_data: {},
  }

  const agentName = categoryToAgent(classified.category)
  if (!agentName) {
    return NextResponse.json({ error: `No agent mapped for category: ${classified.category}` }, { status: 422 })
  }

  const result = await triggerAgent(agentName, classified)

  return NextResponse.json({
    ok:         result.status === 'triggered',
    fixture_id: fixture.id,
    label:      fixture.label,
    category:   fixture.category,
    agent:      agentName,
    session_id: result.session_id,
    status:     result.status,
    error:      result.error ?? null,
  })
}
