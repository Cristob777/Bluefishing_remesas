import Anthropic from '@anthropic-ai/sdk'
import type { EmailCategory, WebhookEmailPayload, ClassifiedEmail } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const supplierNames  = (process.env.SUPPLIER_NAMES       ?? 'proveedores conocidos').split(',').map(s => s.trim()).join(', ')
const customsAgency  = process.env.CUSTOMS_AGENCY_NAME   ?? 'agencia de aduana'
const ownerName      = process.env.OWNER_NAME            ?? 'el propietario'
const financeName    = process.env.FINANCE_NAME          ?? 'el gerente financiero'

const SYSTEM = `Eres un clasificador de emails para una empresa importadora de productos de pesca deportiva en Chile.
Clasifica el email en UNA de estas categorías:

- INVOICE_PROVEEDOR    → factura/proforma de proveedor (${supplierNames})
- INSTRUCCION_PAGO     → ${ownerName} instruye a ${financeName} cuánto pagar y a quién
- PROVISION_FONDOS     → ${customsAgency} solicita fondos/provisión para despacho aduanero
- DIN_DESPACHO         → llegó DIN o factura de agencia de aduana post-despacho
- NOTA_DEBITO_AGENSA   → ${customsAgency} emite nota de débito por saldo a favor (provisión pagada > costo real del despacho)
- UNKNOWN              → ninguna categoría anterior

Señales clave para NOTA_DEBITO_AGENSA: palabras como "nota de débito", "saldo a favor", "devolución", "reembolso", "diferencia a su favor", monto menor al solicitado originalmente.

Responde SOLO con JSON válido (sin markdown):
{
  "category": "CATEGORIA",
  "confidence": 0.95,
  "extracted_data": {},
  "reasoning": "una línea"
}`

export async function classifyEmail(
  payload: WebhookEmailPayload
): Promise<ClassifiedEmail> {
  const userContent = [
    `From: ${payload.email_from}`,
    `Subject: ${payload.email_subject}`,
    `Account: ${payload.account}`,
    '',
    payload.email_body,
    payload.attachment_filename ? `\nAdjunto: ${payload.attachment_filename}` : '',
    payload.attachment_text ? `\nContenido adjunto:\n${payload.attachment_text}` : '',
  ]
    .join('\n')
    .trim()

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: SYSTEM,
      messages: [{ role: 'user', content: userContent }],
    })

    const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
    const parsed = JSON.parse(text) as {
      category: EmailCategory
      confidence: number
      extracted_data: Record<string, unknown>
    }

    return {
      ...payload,
      category: parsed.category,
      confidence: parsed.confidence ?? 0,
      extracted_data: parsed.extracted_data ?? {},
    }
  } catch {
    return { ...payload, category: 'UNKNOWN', confidence: 0, extracted_data: {} }
  }
}
