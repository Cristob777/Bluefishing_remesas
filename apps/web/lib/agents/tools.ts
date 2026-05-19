import Anthropic from '@anthropic-ai/sdk'
import { db } from '@/lib/supabase'

function getSupabase() { return db }

// ── Tool definitions ────────────────────────────────────────────────────────

export const supabaseTool: Anthropic.Tool = {
  name: 'supabase_execute_sql',
  description: `Execute SQL on the Bluefishing PostgreSQL database (service_role access).

IMPORTANT: For INSERT/UPDATE/DELETE always include a RETURNING clause so you get the row back.
  Good:  INSERT INTO remesas (...) VALUES (...) RETURNING id, estado
  Good:  UPDATE remesas SET estado = 'X' WHERE id = '...' RETURNING id
  Bad:   UPDATE remesas SET estado = 'X' WHERE id = '...'   ← no RETURNING

Tables and key columns:
  proveedores(id, nombre, pais, moneda, contacto_email)
  remesas(id, proveedor_id, numero_invoice, estado, moneda_origen, monto_original,
          condicion_pago, numero_despacho, din_numero, fecha_invoice, notas, created_at)
  pagos(id, remesa_id, tipo, monto_moneda_origen, moneda, monto_clp, fx_rate, fx_fecha,
        estado, orden_pago_numero, fecha_confirmacion)
  provisiones_fondos(id, remesa_id, numero_despacho, monto_clp, fecha_vencimiento,
                     es_urgente, estado, email_id_origen, recibido_por)
  stock_items(id, recepcion_id, remesa_id, sku, descripcion,
              cantidad_invoice, cantidad_recibida, diferencia, precio_unitario_usd)
  documentos(id, remesa_id, tipo, numero, monto, moneda, fecha, email_id_origen)
  alertas(id, remesa_id, tipo, mensaje, urgente, leida, destinatario)
  agent_logs(id, agent_name, session_id, remesa_id, accion, payload, resultado, error_mensaje)
  fx_rates(id, moneda, fecha, tasa_clp, fuente)

Estado values for remesas:
  INVOICE_RECIBIDO → PAGO_PENDIENTE → PAGO_PARCIAL → PAGO_COMPLETO
  → EN_ADUANA → PROVISION_RECIBIDA → MERCADERIA_RECIBIDA → RECONCILIADO

Returns: JSON array of rows, or {"error":"...", "sqlstate":"..."} on failure.`,
  input_schema: {
    type: 'object' as const,
    properties: {
      sql: {
        type: 'string',
        description: 'SQL query. Always add RETURNING clause for DML.',
      },
    },
    required: ['sql'],
  },
}

export const fxRateTool: Anthropic.Tool = {
  name: 'get_fx_rate',
  description: `Get the FX rate (CLP per 1 unit of foreign currency) for a specific date.
Checks fx_rates cache first; calls CMF Chile API on miss and caches the result.
CNH is treated as dolar (CMF has no CNH separate rate).
Returns: { tasa_clp: number, source: "cache"|"CMF", moneda, fecha }
         or { error: string, tasa_clp: null } on failure.`,
  input_schema: {
    type: 'object' as const,
    properties: {
      moneda: {
        type: 'string',
        enum: ['USD', 'JPY', 'EUR', 'CNH', 'CNY'],
        description: 'Currency code',
      },
      fecha: {
        type: 'string',
        description: 'Date in YYYY-MM-DD format',
      },
    },
    required: ['moneda', 'fecha'],
  },
}

// ── Tool handlers ────────────────────────────────────────────────────────────

export async function handleSupabaseSQL(input: { sql: string }) {
  const supabase = getSupabase()
  const { data, error } = await supabase.rpc('run_sql', { sql_text: input.sql })
  if (error) return { error: error.message, success: false }
  return data
}

export async function handleGetFxRate(input: { moneda: string; fecha: string }) {
  const supabase = getSupabase()
  const { moneda, fecha } = input

  // Check local cache first
  const { data: cached } = await supabase
    .from('fx_rates')
    .select('tasa_clp')
    .eq('moneda', moneda)
    .eq('fecha', fecha)
    .single()

  if (cached) return { tasa_clp: cached.tasa_clp, source: 'cache', moneda, fecha }

  // CMF Chile API
  const monedaMap: Record<string, string> = {
    USD: 'dolar', JPY: 'yen', EUR: 'euro', CNH: 'dolar', CNY: 'dolar',
  }
  const cmfMoneda = monedaMap[moneda.toUpperCase()] ?? 'dolar'
  const [year, month, day] = fecha.split('-')
  const apiKey = process.env.CMF_API_KEY
  const keyParam = apiKey ? `?apikey=${apiKey}&formato=json` : '?formato=json'
  const url = `https://api.cmfchile.cl/api-sbifv3/recursos_api/${cmfMoneda}/${year}/${month}/${day}${keyParam}`

  let tasa = 0
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } })
    const json = await res.json() as Record<string, Array<{ Valor: string }>>
    const raw =
      cmfMoneda === 'dolar' ? json.Dolares?.[0]?.Valor
      : cmfMoneda === 'yen'  ? json.Yenes?.[0]?.Valor
      : json.Euros?.[0]?.Valor
    tasa = parseFloat((raw ?? '0').replace(',', '.'))
  } catch {
    return { error: 'CMF API unreachable', tasa_clp: null, moneda, fecha }
  }

  if (tasa > 0) {
    await supabase.from('fx_rates').upsert({ moneda, fecha, tasa_clp: tasa, fuente: 'CMF' })
  }

  return { tasa_clp: tasa, source: 'CMF', moneda, fecha }
}

export const toolHandlers: Record<string, (input: unknown) => Promise<unknown>> = {
  supabase_execute_sql: (i) => handleSupabaseSQL(i as { sql: string }),
  get_fx_rate: (i) => handleGetFxRate(i as { moneda: string; fecha: string }),
}
