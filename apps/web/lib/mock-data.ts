// Mock data centralizado para UI demo — Datos ficticios por seguridad

// ── Action types ──────────────────────────────────────────────────────────────

export interface InstruccionPagoAction {
  id: string; type: 'INSTRUCCION_PAGO'
  title: string; description: string
  invoice: string; remesa_id: string; proveedor: string
  monto_original: number; moneda: string
  urgente: boolean; created_at: string
}

export interface EmitirOrdenPagoAction {
  id: string; type: 'EMITIR_ORDEN_PAGO'
  title: string; description: string
  invoice: string; remesa_id: string; pago_id: string; proveedor: string
  monto_pago: number; moneda: string
  tipo_pago: 'ANTICIPO' | 'SALDO' | 'UNICO'; condicion_pago: string
  instruccion_notas: string; urgente: boolean; created_at: string
}

export interface ConfirmarPagoBancarioAction {
  id: string; type: 'CONFIRMAR_PAGO_BANCARIO'
  title: string; description: string
  invoice: string; remesa_id: string; pago_id: string; proveedor: string
  monto_pago: number; moneda: string
  tipo_pago: 'ANTICIPO' | 'SALDO' | 'UNICO'; numero_orden: string
  urgente: boolean; created_at: string
}

export interface ConfirmarProvisionAction {
  id: string; type: 'CONFIRMAR_PROVISION'
  title: string; description: string
  provision_id: string; numero_despacho: string
  monto_clp: number; fecha_vencimiento: string; dias_restantes: number
  cuentas_agencia?: string
  nombre_agencia?: string
  urgente: boolean; created_at: string
}

export interface IngresarStockAction {
  id: string; type: 'INGRESAR_STOCK'
  title: string; description: string
  invoice: string; remesa_id: string; recepcion_id: string; proveedor: string
  urgente: boolean; created_at: string
  skus: Array<{ id: string; sku: string; descripcion: string; cantidad_invoice: number }>
}

export interface ReclamoProveedorAction {
  id: string; type: 'RECLAMO_PROVEEDOR'
  title: string; description: string
  invoice: string; remesa_id: string; proveedor: string
  contacto_email: string | null
  urgente: boolean; created_at: string
  diferencias: Array<{ sku: string; descripcion: string; cantidad_invoice: number; cantidad_recibida: number; diferencia: number }>
}

export interface VincularDespachoAction {
  id: string; type: 'VINCULAR_DESPACHO'
  title: string; description: string
  invoice: string; remesa_id: string; proveedor: string; moneda: string
  monto_original: number; fecha_invoice: string
  urgente: boolean; created_at: string
}

export interface AprobarOperacionAction {
  id: string; type: 'APROBAR_OPERACION'
  title: string; description: string
  invoice: string; remesa_id: string; proveedor: string
  monto_original: number; moneda: string; monto_clp_estimado: number
  agent_reasoning?: string
  urgente: boolean; created_at: string
}

export interface ArchivarExpedienteAction {
  id: string; type: 'ARCHIVAR_EXPEDIENTE'
  title: string; description: string
  invoice: string; remesa_id: string; proveedor: string; numero_despacho: string
  urgente: boolean; created_at: string
  checklist: Array<{ id: string; label: string; auto_verified: boolean }>
}

export type PendingAction =
  | InstruccionPagoAction
  | EmitirOrdenPagoAction
  | ConfirmarPagoBancarioAction
  | ConfirmarProvisionAction
  | IngresarStockAction
  | ReclamoProveedorAction
  | VincularDespachoAction
  | AprobarOperacionAction
  | ArchivarExpedienteAction

// ── Mock remesas ──────────────────────────────────────────────────────────────

export const MOCK_REMESAS = [
  {
    id: '1', numero_invoice: 'OGS-2026-0412',
    proveedor: { nombre: 'OCEAN GEAR SUPPLIES CO.', pais: 'China', moneda: 'USD' },
    monto_original: 9779, moneda_origen: 'USD', condicion_pago: '30/70',
    estado: 'PAGO_PARCIAL', numero_despacho: 'DSP-26-0041',
    fecha_invoice: '2026-04-08', created_at: '2026-04-09T10:00:00Z',
    notas: 'Primer envío temporada 2026',
  },
  {
    id: '2', numero_invoice: 'HTI-2026-0238',
    proveedor: { nombre: 'HORIZON TACKLE INC.', pais: 'Japón', moneda: 'JPY' },
    monto_original: 1240000, moneda_origen: 'JPY', condicion_pago: '100%',
    estado: 'EN_ADUANA', numero_despacho: 'DSP-26-0038',
    fecha_invoice: '2026-03-28', created_at: '2026-03-29T08:30:00Z', notas: null,
  },
  {
    id: '3', numero_invoice: 'NEX-2026-0091',
    proveedor: { nombre: 'NEXUS INDUSTRIAL LTD.', pais: 'Japón', moneda: 'JPY' },
    monto_original: 880000, moneda_origen: 'JPY', condicion_pago: '50/50',
    estado: 'PROVISION_RECIBIDA', numero_despacho: 'DSP-26-0033',
    fecha_invoice: '2026-03-15', created_at: '2026-03-16T09:00:00Z', notas: null,
  },
  {
    id: '4', numero_invoice: 'OGS-2026-0389',
    proveedor: { nombre: 'OCEAN GEAR SUPPLIES CO.', pais: 'China', moneda: 'USD' },
    monto_original: 15430, moneda_origen: 'USD', condicion_pago: '30/70',
    estado: 'INVOICE_RECIBIDO', numero_despacho: null,
    fecha_invoice: '2026-04-17', created_at: '2026-04-18T07:15:00Z',
    notas: 'Urgente — pagar anticipo esta semana',
  },
  {
    id: '5', numero_invoice: 'HTI-2026-0201',
    proveedor: { nombre: 'HORIZON TACKLE INC.', pais: 'Japón', moneda: 'JPY' },
    monto_original: 2100000, moneda_origen: 'JPY', condicion_pago: '50/50',
    estado: 'RECONCILIADO', numero_despacho: 'DSP-26-0021',
    fecha_invoice: '2026-02-10', created_at: '2026-02-11T11:00:00Z', notas: null,
  },
]

// ── Mock alertas ──────────────────────────────────────────────────────────────

export const MOCK_ALERTAS = [
  { id: 'a1', tipo: 'PROVISION_URGENTE',    mensaje: 'Provisión aduana DSP-26-0038 vence en 2 días — CLP $2.140.000',            urgente: true,  destinatario: 'operaciones', created_at: '2026-04-21T08:00:00Z', leida: false },
  { id: 'a2', tipo: 'PAGO_PENDIENTE',       mensaje: 'Anticipo 30% OCEAN GEAR OGS-2026-0412 pendiente de emisión',               urgente: false, destinatario: 'operaciones', created_at: '2026-04-20T14:30:00Z', leida: false },
  { id: 'a3', tipo: 'APROBACION_REQUERIDA', mensaje: 'Operación OGS-2026-0389 supera CLP $5M — requiere aprobación Gerencia',    urgente: true,  destinatario: 'gerente',     created_at: '2026-04-18T09:00:00Z', leida: false },
  { id: 'a4', tipo: 'DIFERENCIA_STOCK',     mensaje: 'Recepción OGS-20260408: 20 unidades faltantes en Destorcedores Metal 80lb', urgente: false, destinatario: 'operaciones', created_at: '2026-04-20T11:00:00Z', leida: false },
]

// ── Mock agent logs ───────────────────────────────────────────────────────────

export const MOCK_AGENT_LOGS = [
  { id: 'l1', agent_name: 'invoice_intake',     accion: 'INVOICE_PROCESADO',   resultado: 'SUCCESS',          created_at: '2026-04-18T07:20:00Z' },
  { id: 'l2', agent_name: 'customs_funds',       accion: 'PROVISION_DETECTADA', resultado: 'SUCCESS',          created_at: '2026-04-17T16:45:00Z' },
  { id: 'l3', agent_name: 'invoice_intake',     accion: 'INVOICE_PROCESADO',   resultado: 'SUCCESS',          created_at: '2026-04-17T11:10:00Z' },
  { id: 'l4', agent_name: 'din_reconciliation', accion: 'DIN_RECONCILIADO',    resultado: 'SUCCESS',          created_at: '2026-04-15T09:00:00Z' },
  { id: 'l5', agent_name: 'landed_cost',        accion: 'COSTO_CALCULADO',     resultado: 'PENDING_APPROVAL', created_at: '2026-04-14T17:30:00Z' },
]

// ── Mock stats ────────────────────────────────────────────────────────────────

export const MOCK_STATS = {
  remesasActivas: 4, pagosPendientes: 2,
  provisionesUrgentes: 1, diferenciasStock: 0,
  totalUSD: 25209, totalJPY: 4220000,
}

// ── Mock pending actions (9 workflow types) ───────────────────────────────────

export const MOCK_PENDING_ACTIONS: PendingAction[] = [
  // Etapa I — Sebastian define condición de pago
  {
    id: 'act-1', type: 'INSTRUCCION_PAGO',
    title: 'Definir condición de pago',
    description: 'OCEAN GEAR SUPPLIES — Invoice OGS-2026-0389 — USD $15,430.00',
    invoice: 'OGS-2026-0389', remesa_id: '4',
    proveedor: 'OCEAN GEAR SUPPLIES CO.',
    monto_original: 15430, moneda: 'USD',
    urgente: true, created_at: '2026-04-18T09:00:00Z',
  },

  // Etapa II — Hector emite orden al banco
  {
    id: 'act-2', type: 'EMITIR_ORDEN_PAGO',
    title: 'Emitir orden de pago al banco',
    description: 'OCEAN GEAR SUPPLIES — Anticipo 30% — USD $2,933.70',
    invoice: 'OGS-2026-0412', remesa_id: '1', pago_id: 'pago-001',
    proveedor: 'OCEAN GEAR SUPPLIES CO.',
    monto_pago: 2933.70, moneda: 'USD',
    tipo_pago: 'ANTICIPO', condicion_pago: '30/70',
    instruccion_notas: 'Pagar anticipo 30% vía SWIFT a cuenta USD AMIGOS COMPANY',
    urgente: false, created_at: '2026-04-20T14:30:00Z',
  },

  // Etapa II — Hector confirma que el banco ejecutó el pago
  {
    id: 'act-6', type: 'CONFIRMAR_PAGO_BANCARIO',
    title: 'Confirmar pago ejecutado por banco',
    description: 'NEXUS INDUSTRIAL — Anticipo 50% — JPY ¥440,000',
    invoice: 'NEX-2026-0091', remesa_id: '3', pago_id: 'pago-002',
    proveedor: 'NEXUS INDUSTRIAL LTD.',
    monto_pago: 440000, moneda: 'JPY',
    tipo_pago: 'ANTICIPO', numero_orden: 'OP-2026-0388',
    urgente: false, created_at: '2026-04-22T10:00:00Z',
  },

  // Etapa III — Hector confirma pago a AGENSA
  {
    id: 'act-3', type: 'CONFIRMAR_PROVISION',
    title: 'Confirmar pago provisión AGENSA',
    description: 'Despacho DSP-26-0038 — Vence en 2 días — CLP $2.140.000',
    provision_id: 'prov-001', numero_despacho: 'DSP-26-0038',
    monto_clp: 2140000, fecha_vencimiento: '2026-04-26', dias_restantes: 2,
    urgente: true, created_at: '2026-04-21T08:00:00Z',
  },

  // Etapa IV — Bodega ingresa cantidades reales
  {
    id: 'act-4', type: 'INGRESAR_STOCK',
    title: 'Ingresar stock recibido en bodega',
    description: 'HORIZON TACKLE INC. — HTI-2026-0238 — 3 SKUs por contar',
    invoice: 'HTI-2026-0238', remesa_id: '2', recepcion_id: 'rec-001',
    proveedor: 'HORIZON TACKLE INC.',
    urgente: false, created_at: '2026-04-21T10:00:00Z',
    skus: [
      { id: 'sku-1', sku: 'VR-5050', descripcion: 'Línea Fluorocarbono 0.28mm 100m',    cantidad_invoice: 50  },
      { id: 'sku-2', sku: 'MH-4030', descripcion: 'Carrete spinning MH-3000',            cantidad_invoice: 20  },
      { id: 'sku-3', sku: 'VR-8080', descripcion: 'Anzuelo Owner ST-46 2/0 (pack x10)', cantidad_invoice: 200 },
    ],
  },

  // Etapa IV — Sebastian genera reclamo por diferencia de stock
  {
    id: 'act-7', type: 'RECLAMO_PROVEEDOR',
    title: 'Generar reclamo al proveedor',
    description: 'OCEAN GEAR SUPPLIES — OGS-2026-0412 — 20 unidades faltantes',
    invoice: 'OGS-2026-0412', remesa_id: '1',
    proveedor: 'OCEAN GEAR SUPPLIES CO.',
    contacto_email: null,
    urgente: false, created_at: '2026-04-20T11:00:00Z',
    diferencias: [
      { sku: 'OG-DM80', descripcion: 'Destorcedor Metal 80lb',     cantidad_invoice: 120, cantidad_recibida: 100, diferencia: -20 },
      { sku: 'OG-AN42', descripcion: 'Anzuelo Triple 4/2 (x50)',   cantidad_invoice: 50,  cantidad_recibida: 50,  diferencia: 0  },
    ],
  },

  // Etapa I-II — Vincular número de despacho asignado por AGENSA
  {
    id: 'act-8', type: 'VINCULAR_DESPACHO',
    title: 'Vincular número de despacho',
    description: 'OCEAN GEAR SUPPLIES — OGS-2026-0389 — sin despacho asignado',
    invoice: 'OGS-2026-0389', remesa_id: '4',
    proveedor: 'OCEAN GEAR SUPPLIES CO.',
    moneda: 'USD', monto_original: 15430,
    fecha_invoice: '2026-04-17',
    urgente: false, created_at: '2026-04-23T09:00:00Z',
  },

  // Etapa V — Aprobación operación >5M
  {
    id: 'act-5', type: 'APROBAR_OPERACION',
    title: 'Aprobar operación mayor a CLP $5M',
    description: 'NEXUS INDUSTRIAL — NEX-2026-0091 — JPY ¥880,000 (~CLP $5.8M)',
    invoice: 'NEX-2026-0091', remesa_id: '3',
    proveedor: 'NEXUS INDUSTRIAL LTD.',
    monto_original: 880000, moneda: 'JPY', monto_clp_estimado: 5808000,
    urgente: false, created_at: '2026-04-19T11:00:00Z',
  },

  // Etapa V — Archivar expediente completo (remesa reconciliada)
  {
    id: 'act-9', type: 'ARCHIVAR_EXPEDIENTE',
    title: 'Archivar expediente completo',
    description: 'HORIZON TACKLE INC. — HTI-2026-0201 — RECONCILIADO · listo para cierre',
    invoice: 'HTI-2026-0201', remesa_id: '5',
    proveedor: 'HORIZON TACKLE INC.', numero_despacho: 'DSP-26-0021',
    urgente: false, created_at: '2026-04-24T08:00:00Z',
    checklist: [
      { id: 'chk-1', label: 'Invoice del proveedor recibido',          auto_verified: true  },
      { id: 'chk-2', label: 'Pagos confirmados por banco (con SWIFT)',  auto_verified: true  },
      { id: 'chk-3', label: 'Número de despacho vinculado',             auto_verified: true  },
      { id: 'chk-4', label: 'Provisión de fondos pagada a AGENSA',      auto_verified: true  },
      { id: 'chk-5', label: 'DIN registrado en sistema',                auto_verified: true  },
      { id: 'chk-6', label: 'Factura honorarios AGENSA registrada',     auto_verified: false },
      { id: 'chk-7', label: 'Stock ingresado a Bsale',                  auto_verified: true  },
      { id: 'chk-8', label: 'Landed cost calculado por agente',         auto_verified: true  },
    ],
  },
]
