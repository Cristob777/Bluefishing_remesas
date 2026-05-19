export type Currency = 'USD' | 'JPY' | 'EUR' | 'CNY' | 'CNH'

export type RemesaEstado =
  | 'INVOICE_RECIBIDO'
  | 'PAGO_PENDIENTE'
  | 'PAGO_PARCIAL'
  | 'PAGO_COMPLETO'
  | 'EN_ADUANA'
  | 'PROVISION_RECIBIDA'
  | 'MERCADERIA_RECIBIDA'
  | 'RECONCILIADO'
  | 'SALDO_FAVOR'   // provisión > costo real → esperando nota de débito AGENSA

export type PagoEstado = 'PENDIENTE' | 'EMITIDO' | 'CONFIRMADO'
export type PagoTipo = 'ANTICIPO' | 'SALDO' | 'UNICO'
export type DocumentoTipo = 'INVOICE' | 'DIN' | 'FACTURA_AGENSA' | 'PROVISION' | 'NOTA_DEBITO' | 'OTRO'
export type AlertaTipo =
  | 'PROVISION_URGENTE'
  | 'PAGO_PENDIENTE'
  | 'DIFERENCIA_STOCK'
  | 'APROBACION_REQUERIDA'
  | 'SALDO_FAVOR_AGENSA'  // provisión pagó de más → nota de débito pendiente

export type AgentName =
  | 'invoice_intake'
  | 'customs_funds'
  | 'din_reconciliation'
  | 'nota_debito'
  | 'landed_cost'

export type EmailCategory =
  | 'INVOICE_PROVEEDOR'
  | 'INSTRUCCION_PAGO'
  | 'PROVISION_FONDOS'
  | 'DIN_DESPACHO'
  | 'NOTA_DEBITO_AGENSA'  // AGENSA devuelve saldo a favor por provisión > costo real
  | 'UNKNOWN'

export interface Proveedor {
  id: string
  nombre: string
  pais: string
  moneda: Currency
  contacto_nombre: string | null
  contacto_email: string | null
  created_at: string
}

export interface Remesa {
  id: string
  proveedor_id: string
  numero_invoice: string
  estado: RemesaEstado
  moneda_origen: Currency
  monto_original: number
  monto_total_usd: number | null
  monto_total_jpy: number | null
  condicion_pago: string | null
  numero_despacho: string | null
  din_numero: string | null
  fecha_invoice: string | null
  notas: string | null
  created_at: string
  updated_at: string
  proveedor?: Proveedor
  pagos?: Pago[]
  alertas?: Pick<Alerta, 'id' | 'tipo' | 'urgente' | 'leida'>[]
}

export interface Pago {
  id: string
  remesa_id: string
  tipo: PagoTipo
  monto_moneda_origen: number
  moneda: Currency
  monto_clp: number | null
  fx_rate: number | null
  fx_fecha: string | null
  estado: PagoEstado
  orden_pago_numero: string | null
  fecha_emision: string | null
  fecha_confirmacion: string | null
  created_by: string | null
  created_at: string
}

export interface ProvisionFondos {
  id: string
  remesa_id: string | null
  numero_despacho: string
  monto_clp: number
  fecha_vencimiento: string | null
  es_urgente: boolean
  estado: 'PENDIENTE' | 'PAGADO'
  email_id_origen: string | null
  recibido_por: string[]
  created_at: string
  paid_at: string | null
}

export interface StockRecepcion {
  id: string
  remesa_id: string
  fecha_recepcion: string
  estado: 'PENDIENTE' | 'CONTADO' | 'INGRESADO_BSALE' | 'CON_DIFERENCIAS'
  ingresado_bsale_at: string | null
  created_at: string
  items?: StockItem[]
}

export interface StockItem {
  id: string
  recepcion_id: string
  remesa_id: string
  sku: string
  descripcion: string | null
  cantidad_invoice: number
  cantidad_recibida: number | null
  diferencia: number | null
  bsale_product_id: string | null
  precio_unitario_usd: number | null
  created_at: string
}

export interface Documento {
  id: string
  remesa_id: string | null
  tipo: DocumentoTipo
  numero: string | null
  archivo_nombre: string | null
  archivo_url: string | null
  monto: number | null
  moneda: string | null
  fecha: string | null
  email_id_origen: string | null
  created_at: string
}

export interface Alerta {
  id: string
  remesa_id: string | null
  tipo: AlertaTipo
  mensaje: string
  urgente: boolean
  leida: boolean
  destinatario: string | null
  created_at: string
  leida_at: string | null
}

export interface AgentLog {
  id: string
  agent_name: AgentName
  session_id: string | null
  remesa_id: string | null
  accion: string
  payload: Record<string, unknown> | null
  resultado: 'SUCCESS' | 'ERROR' | 'PENDING_APPROVAL' | null
  error_mensaje: string | null
  created_at: string
}

export interface FxRate {
  id: string
  moneda: Currency
  fecha: string
  tasa_clp: number
  fuente: string
  created_at: string
}

export interface WebhookEmailPayload {
  email_id: string
  email_from: string
  email_subject: string
  email_body: string
  attachment_text?: string
  attachment_filename?: string
  account: string  // 'sebastian' | 'hector' | 'ops' | any named slot
}

export interface ClassifiedEmail extends WebhookEmailPayload {
  category: EmailCategory
  confidence: number
  extracted_data: Record<string, unknown>
}
