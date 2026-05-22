import type { EmailCategory, WebhookEmailPayload, ClassifiedEmail } from '@/types'
import { ai, MODELS } from '@/lib/ai'
import { config } from '@/lib/config'

function buildSystem() {
  const { supplierNames, customsAgency, ownerName, financeName } = config.classifier
  return `Eres un clasificador de emails para una empresa importadora de productos de pesca deportiva en Chile.
Clasifica el email en UNA de estas categorías:

- INVOICE_PROVEEDOR    → factura/proforma de proveedor (${supplierNames})
- INSTRUCCION_PAGO     → ${ownerName} instruye a ${financeName} cuánto pagar y a quién
- PROVISION_FONDOS     → ${customsAgency} solicita fondos/provisión para despacho aduanero
- DIN_DESPACHO         → llegó DIN o factura de agencia de aduana post-despacho
- NOTA_DEBITO_AGENSA   → ${customsAgency} emite nota de débito/crédito o informa saldo a favor (provisión pagada > costo real del despacho)
- UNKNOWN              → ninguna categoría anterior

Señales clave para NOTA_DEBITO_AGENSA: palabras como "nota de crédito", "nota de débito", "saldo a favor", "devolución", "reembolso", "diferencia a su favor", "abono", monto menor al solicitado originalmente.

Responde SOLO con JSON válido (sin markdown):
{
  "category": "CATEGORIA",
  "confidence": 0.95,
  "extracted_data": {},
  "reasoning": "una línea"
}`
}

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
    const msg = await ai.messages.create({
      model: MODELS.classifier,
      max_tokens: 512,
      system: buildSystem(),
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
