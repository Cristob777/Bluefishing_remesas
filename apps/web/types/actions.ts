// TypeScript interfaces for workflow action types

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

export interface RegistrarNotaAgensaAction {
  id: string; type: 'REGISTRAR_NOTA_AGENSA'
  title: string; description: string
  invoice: string; remesa_id: string; proveedor: string
  alert_id?: string
  numero_despacho: string
  din_numero: string | null
  provision_pagada_clp: number
  costo_real_clp: number
  saldo_favor_clp: number
  mensaje_alerta?: string
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
  | RegistrarNotaAgensaAction
  | ArchivarExpedienteAction
