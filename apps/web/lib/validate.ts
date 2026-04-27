import { z } from 'zod/v4'
import { NextResponse } from 'next/server'

// ── Shared primitives ────────────────────────────────────────────────────────

const uuid    = z.string().uuid()
const positiveNum = z.number().positive()
const currency = z.enum(['USD', 'JPY', 'EUR', 'CNY', 'CNH', 'CLP'])

// ── Per-route schemas ────────────────────────────────────────────────────────

export const InstruccionPagoSchema = z.object({
  remesa_id:       uuid,
  condicion_pago:  z.string().min(1).max(100),
  anticipo_pct:    z.number().min(0).max(100),
  monto_anticipo:  positiveNum,
  monto_saldo:     z.number().min(0),
  moneda:          currency,
  notas:           z.string().max(500).optional(),
})

export const OrdenPagoSchema = z.object({
  pago_id:             uuid,
  numero_orden:        z.string().min(1).max(50),
  fecha_emision:       z.string().date(),
  monto_clp:           positiveNum,
  tipo_cambio_usado:   positiveNum,
  banco:               z.string().min(1).max(100),
  cuenta_destino:      z.string().min(1).max(100),
})

export const ConfirmarPagoBancarioSchema = z.object({
  pago_id:             uuid,
  fecha_confirmacion:  z.string().date(),
  referencia_swift:    z.string().min(1).max(50),
  comprobante_url:     z.string().url().optional(),
})

export const ConfirmarProvisionSchema = z.object({
  provision_id:  uuid,
  alert_id:      uuid.optional(),
})

export const ApprovePaymentSchema = z.object({
  pago_id:   uuid,
  alert_id:  uuid.optional(),
})

export const VincularDespachoSchema = z.object({
  remesa_id:        uuid,
  numero_despacho:  z.string().regex(/^DSP-\d{2}-\d{4}$/i, 'Formato inválido — use DSP-AÑO-NNNN'),
})

export const ReclamoProveedorSchema = z.object({
  recepcion_id:    uuid,
  texto_reclamo:   z.string().min(10).max(1000),
  items_con_diff:  z.array(z.object({
    sku:            z.string().min(1).max(50),
    esperado:       z.number().int().nonnegative(),
    recibido:       z.number().int().nonnegative(),
  })),
})

export const AcceptStockSchema = z.object({
  recepcion_id:  uuid,
  alert_id:      uuid.optional(),
})

export const ArchivarExpedienteSchema = z.object({
  remesa_id:  uuid,
})

export const ResolveAlertSchema = z.object({
  alert_id:  uuid,
})

// ── Helper ───────────────────────────────────────────────────────────────────

export function parseBody<T>(
  schema: z.ZodType<T>,
  data: unknown,
): { ok: true; data: T } | { ok: false; response: NextResponse } {
  const result = schema.safeParse(data)
  if (result.success) return { ok: true, data: result.data }

  return {
    ok: false,
    response: NextResponse.json(
      { error: 'Invalid request', details: result.error.issues.map(i => i.message) },
      { status: 400 },
    ),
  }
}
