import { NextRequest, NextResponse } from 'next/server'
import { classifyEmail } from '@/lib/email-classifier'
import { triggerAgent, categoryToAgent, handleInstruccionPago } from '@/lib/managed-agents'
import { supabase } from '@/lib/supabase'
import { rateLimit } from '@/lib/rateLimit'
import {
  getClientIp,
  validateWebhookPayload,
  sanitizePayload,
  timingSafeEqual,
} from '@/lib/security'
import type { WebhookEmailPayload } from '@/types'

async function tagDocumentsWithDocumentAiId(payload: WebhookEmailPayload) {
  if (!payload.google_document_ai_id) return

  const { error } = await supabase
    .from('documentos')
    .update({
      google_document_ai_id:          payload.google_document_ai_id,
      google_document_ai_revision_id: payload.google_document_ai_revision_id ?? null,
      google_document_ai_processor:   payload.google_document_ai_processor ?? null,
      google_document_ai_gcs_uri:     payload.google_document_ai_gcs_uri ?? null,
    })
    .eq('email_id_origen', payload.email_id)

  if (error) {
    console.error('[webhook-email] document_ai_tag_failed', {
      email_id: payload.email_id,
      google_document_ai_id: payload.google_document_ai_id,
      error: error.message,
    })
  }
}

export async function POST(req: NextRequest) {
  // 1. Rate limiting
  const ip = getClientIp(req)
  const limited = rateLimit(req, 'webhook')
  if (limited) return limited

  // 2. Autenticación — comparación timing-safe para evitar timing attacks
  const secret = req.headers.get('x-webhook-secret') ?? ''
  const expectedSecret = process.env.WEBHOOK_SECRET ?? ''
  if (!expectedSecret || !timingSafeEqual(secret, expectedSecret)) {
    await supabase.from('agent_logs').insert({
      agent_name: 'invoice_intake',
      accion: 'WEBHOOK_AUTH_FAILED',
      payload: { ip, secret_provided: secret.length > 0 },
      resultado: 'ERROR',
      error_mensaje: 'Invalid or missing webhook secret',
    })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 3. Parsear body con límite de tamaño
  let rawPayload: unknown
  try {
    const text = await req.text()
    if (text.length > 300_000) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    }
    rawPayload = JSON.parse(text)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // 4. Validación estructural del payload
  const validation = validateWebhookPayload(rawPayload)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 422 })
  }

  // 5. Sanitizar y procesar
  const payload = sanitizePayload(rawPayload as WebhookEmailPayload)

  // 5b. Sender domain whitelist — reject spoofed senders before any DB write
  const ALLOWED_DOMAINS = (process.env.ALLOWED_EMAIL_DOMAINS ?? '').split(',').map(d => d.trim().toLowerCase()).filter(Boolean)
  const senderDomain = payload.email_from?.split('@')[1]?.toLowerCase() ?? ''
  if (ALLOWED_DOMAINS.length > 0 && !ALLOWED_DOMAINS.some(d => senderDomain === d || senderDomain.endsWith(`.${d}`))) {
    return NextResponse.json({ status: 'ignored', reason: 'sender_not_whitelisted' })
  }

  // Clasificar email
  const classified = await classifyEmail(payload)

  // Audit: registrar documento raw
  await supabase.from('documentos').insert({
    tipo: 'OTRO',
    numero: payload.email_id,
    email_id_origen: payload.email_id,
    archivo_nombre: payload.attachment_filename ?? null,
  })
  await tagDocumentsWithDocumentAiId(payload)

  // Audit: registrar clasificación
  await supabase.from('agent_logs').insert({
    agent_name: 'invoice_intake',
    accion: 'EMAIL_CLASSIFIED',
    payload: {
      email_id:   payload.email_id,
      from:       payload.email_from,
      subject:    payload.email_subject,
      account:    payload.account,
      ip,
      category:   classified.category,
      confidence: classified.confidence,
    },
    resultado: 'SUCCESS',
  })

  if (classified.category === 'UNKNOWN') {
    return NextResponse.json({ status: 'ignored', category: 'UNKNOWN' })
  }

  // INSTRUCCION_PAGO: no agent — option (c) per WORKFLOW.md §4 Etapa 2
  if (classified.category === 'INSTRUCCION_PAGO') {
    // Try to link to an open remesa by matching invoice number in subject
    let remesaId: string | null = null
    const invoiceMatch = payload.email_subject.match(/\b(BF[-\s]?\d{4}[-\s]?\d{3,6}|INV[-\s]?\d+)\b/i)
    if (invoiceMatch) {
      const { data: remesa } = await supabase
        .from('remesas')
        .select('id')
        .ilike('numero_invoice', `%${invoiceMatch[0]}%`)
        .not('estado', 'eq', 'RECONCILIADO')
        .limit(1)
        .single()
      remesaId = remesa?.id ?? null
    }

    await handleInstruccionPago({
      emailId:      payload.email_id,
      emailFrom:    payload.email_from,
      emailSubject: payload.email_subject,
      remesaId,
    })
    return NextResponse.json({ status: 'pending_human', category: 'INSTRUCCION_PAGO', remesa_id: remesaId })
  }

  const agentName = categoryToAgent(classified.category)
  if (!agentName) {
    return NextResponse.json({ status: 'no_agent', category: classified.category })
  }

  const result = await triggerAgent(agentName, classified)
  await tagDocumentsWithDocumentAiId(payload)

  await supabase.from('agent_logs').insert({
    agent_name: agentName,
    session_id: result.session_id || null,
    accion: 'AGENT_TRIGGERED',
    payload: { email_id: payload.email_id, category: classified.category, ip },
    resultado:     result.status === 'triggered' ? 'SUCCESS' : 'ERROR',
    error_mensaje: result.error ?? null,
  })

  return NextResponse.json({
    status:     result.status === 'triggered' ? 'triggered' : 'error',
    category:   classified.category,
    session_id: result.session_id,
  })
}
