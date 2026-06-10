import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/supabase'

function isDemoRequest(req: NextRequest) {
  const host = req.headers.get('host') ?? ''
  return host.includes('importops') || process.env.DEMO_MODE === 'true'
}

export const maxDuration = 60

export async function POST(req: NextRequest) {
  if (!isDemoRequest(req)) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  try {
    // ── 1. Suppliers ─────────────────────────────────────────
    const { data: suppliers } = await db.from('proveedores').upsert([
      { id: 'a1b2c3d4-0001-0001-0001-000000000001', nombre: 'FishWorld Trading Co.', pais: 'China',  moneda: 'USD', contacto_nombre: 'Coco Yao',      contacto_email: 'coco@fishworld-trading.com' },
      { id: 'a1b2c3d4-0002-0002-0002-000000000002', nombre: 'Tokyo Marine Supply',   pais: 'Japan',  moneda: 'JPY', contacto_nombre: 'Kenji Tanaka',   contacto_email: 'kenji@tokyomarine.jp' },
      { id: 'a1b2c3d4-0003-0003-0003-000000000003', nombre: 'Pacific Gear Co.',       pais: 'USA',    moneda: 'USD', contacto_nombre: 'Sarah Mitchell', contacto_email: 's.mitchell@pacificgear.com' },
    ], { onConflict: 'id' }).select('id, nombre')

    // ── 2. Remesas ────────────────────────────────────────────
    await db.from('remesas').upsert([
      {
        id: 'rem-0001-0001-0001-000000000001', proveedor_id: 'a1b2c3d4-0001-0001-0001-000000000001',
        numero_invoice: 'FW-2026-0142', estado: 'PAGO_PARCIAL',
        moneda_origen: 'USD', monto_original: 4200, condicion_pago: '30/70',
        fecha_invoice: '2026-06-05', notas: 'Spinning reels XP-200/300 batch',
      },
      {
        id: 'rem-0002-0002-0002-000000000002', proveedor_id: 'a1b2c3d4-0002-0002-0002-000000000002',
        numero_invoice: 'TM-2026-0088', estado: 'PROVISION_RECIBIDA',
        moneda_origen: 'JPY', monto_original: 850000, condicion_pago: '100%',
        numero_despacho: 'DSP-2026-00142', fecha_invoice: '2026-05-28',
        notas: 'Fishing lines & leaders — seasonal order',
      },
      {
        id: 'rem-0003-0003-0003-000000000003', proveedor_id: 'a1b2c3d4-0003-0003-0003-000000000003',
        numero_invoice: 'PG-2026-0031', estado: 'EN_ADUANA',
        moneda_origen: 'USD', monto_original: 2800, condicion_pago: '50/50',
        numero_despacho: 'DSP-2026-00138', fecha_invoice: '2026-05-20',
        notas: 'Rod blanks & components Q2',
      },
      {
        id: 'rem-0004-0004-0004-000000000004', proveedor_id: 'a1b2c3d4-0001-0001-0001-000000000001',
        numero_invoice: 'FW-2026-0119', estado: 'RECONCILIADO',
        moneda_origen: 'USD', monto_original: 3600, condicion_pago: '30/70',
        numero_despacho: 'DSP-2026-00127', din_numero: '025-2026-11110000-D',
        fecha_invoice: '2026-04-15', notas: 'Lures & soft baits — closed',
      },
      {
        id: 'rem-0005-0005-0005-000000000005', proveedor_id: 'a1b2c3d4-0002-0002-0002-000000000002',
        numero_invoice: 'TM-2026-0071', estado: 'PAGO_PENDIENTE',
        moneda_origen: 'JPY', monto_original: 1200000, condicion_pago: '100%',
        fecha_invoice: '2026-06-08', notas: 'Premium fluorocarbon lines',
      },
    ], { onConflict: 'id' })

    // ── 3. Payments ───────────────────────────────────────────
    await db.from('pagos').upsert([
      { id: 'pago-0001-0001', remesa_id: 'rem-0001-0001-0001-000000000001', tipo: 'ANTICIPO', monto_moneda_origen: 1260,    moneda: 'USD', monto_clp: 1196100,  fx_rate: 949.29,  fx_fecha: '2026-06-06', estado: 'CONFIRMADO', orden_pago_numero: 'OP-2026-0089', fecha_emision: '2026-06-06', fecha_confirmacion: '2026-06-07', created_by: 'hector' },
      { id: 'pago-0002-0001', remesa_id: 'rem-0001-0001-0001-000000000001', tipo: 'SALDO',    monto_moneda_origen: 2940,    moneda: 'USD', estado: 'PENDIENTE', created_by: 'hector' },
      { id: 'pago-0003-0001', remesa_id: 'rem-0002-0002-0002-000000000002', tipo: 'UNICO',    monto_moneda_origen: 850000, moneda: 'JPY', monto_clp: 5482500,  fx_rate: 6.45,    fx_fecha: '2026-05-30', estado: 'CONFIRMADO', orden_pago_numero: 'OP-2026-0081', fecha_emision: '2026-05-30', fecha_confirmacion: '2026-06-01', created_by: 'hector' },
      { id: 'pago-0004-0001', remesa_id: 'rem-0003-0003-0003-000000000003', tipo: 'ANTICIPO', monto_moneda_origen: 1400,    moneda: 'USD', monto_clp: 1316000,  fx_rate: 940.00,  fx_fecha: '2026-05-21', estado: 'CONFIRMADO', orden_pago_numero: 'OP-2026-0074', fecha_emision: '2026-05-21', fecha_confirmacion: '2026-05-22', created_by: 'hector' },
      { id: 'pago-0005-0001', remesa_id: 'rem-0003-0003-0003-000000000003', tipo: 'SALDO',    monto_moneda_origen: 1400,    moneda: 'USD', estado: 'PENDIENTE', created_by: 'hector' },
      { id: 'pago-0006-0001', remesa_id: 'rem-0004-0004-0004-000000000004', tipo: 'ANTICIPO', monto_moneda_origen: 1080,    moneda: 'USD', monto_clp: 1004400,  fx_rate: 930.00,  fx_fecha: '2026-04-16', estado: 'CONFIRMADO', orden_pago_numero: 'OP-2026-0052', fecha_emision: '2026-04-16', fecha_confirmacion: '2026-04-17', created_by: 'hector' },
      { id: 'pago-0007-0001', remesa_id: 'rem-0004-0004-0004-000000000004', tipo: 'SALDO',    monto_moneda_origen: 2520,    moneda: 'USD', monto_clp: 2344200,  fx_rate: 930.00,  fx_fecha: '2026-05-02', estado: 'CONFIRMADO', orden_pago_numero: 'OP-2026-0061', fecha_emision: '2026-05-02', fecha_confirmacion: '2026-05-03', created_by: 'hector' },
      { id: 'pago-0008-0001', remesa_id: 'rem-0005-0005-0005-000000000005', tipo: 'UNICO',    monto_moneda_origen: 1200000, moneda: 'JPY', estado: 'PENDIENTE', created_by: 'hector' },
    ], { onConflict: 'id' })

    // ── 4. Customs provisions ─────────────────────────────────
    const soon = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10)
    await db.from('provisiones_fondos').upsert([
      { id: 'prov-0001-0001', remesa_id: 'rem-0002-0002-0002-000000000002', numero_despacho: 'DSP-2026-00142', monto_clp: 1850000, fecha_vencimiento: soon, es_urgente: true,  estado: 'PAGADO',    email_id_origen: 'demo-prov-001', recibido_por: ['hector'] },
      { id: 'prov-0002-0001', remesa_id: 'rem-0003-0003-0003-000000000003', numero_despacho: 'DSP-2026-00138', monto_clp: 2400000, fecha_vencimiento: soon, es_urgente: true,  estado: 'PENDIENTE', email_id_origen: 'demo-prov-002', recibido_por: ['hector', 'sebastian'] },
    ], { onConflict: 'id' })

    // ── 5. Documents ──────────────────────────────────────────
    await db.from('documentos').upsert([
      { id: 'doc-0001', remesa_id: 'rem-0001-0001-0001-000000000001', tipo: 'INVOICE',        numero: 'FW-2026-0142', monto: 4200,    moneda: 'USD', confianza: 0.97, agente_nombre: 'invoice_intake',     created_at: '2026-06-05T09:30:00Z' },
      { id: 'doc-0002', remesa_id: 'rem-0002-0002-0002-000000000002', tipo: 'INVOICE',        numero: 'TM-2026-0088', monto: 850000, moneda: 'JPY', confianza: 0.94, agente_nombre: 'invoice_intake',     created_at: '2026-05-28T11:00:00Z' },
      { id: 'doc-0003', remesa_id: 'rem-0002-0002-0002-000000000002', tipo: 'PROVISION',      numero: 'DSP-2026-00142', monto: 1850000, moneda: 'CLP', confianza: 0.99, agente_nombre: 'customs_funds',  created_at: '2026-06-01T14:00:00Z' },
      { id: 'doc-0004', remesa_id: 'rem-0003-0003-0003-000000000003', tipo: 'INVOICE',        numero: 'PG-2026-0031', monto: 2800,   moneda: 'USD', confianza: 0.96, agente_nombre: 'invoice_intake',     created_at: '2026-05-20T08:45:00Z' },
      { id: 'doc-0005', remesa_id: 'rem-0003-0003-0003-000000000003', tipo: 'PROVISION',      numero: 'DSP-2026-00138', monto: 2400000, moneda: 'CLP', confianza: 0.98, agente_nombre: 'customs_funds', created_at: '2026-06-03T10:00:00Z' },
      { id: 'doc-0006', remesa_id: 'rem-0004-0004-0004-000000000004', tipo: 'DIN',            numero: '025-2026-11110000-D', monto: 1820000, moneda: 'CLP', confianza: 0.91, agente_nombre: 'din_reconciliation', created_at: '2026-05-10T15:30:00Z' },
      { id: 'doc-0007', remesa_id: 'rem-0004-0004-0004-000000000004', tipo: 'FACTURA_AGENSA', numero: 'FA-2026-0088', monto: 150000, moneda: 'CLP', confianza: 0.88, agente_nombre: 'nota_debito',       created_at: '2026-05-10T16:00:00Z' },
    ], { onConflict: 'id' })

    // ── 6. Stock ──────────────────────────────────────────────
    await db.from('stock_items').upsert([
      { id: 'stk-0001', remesa_id: 'rem-0002-0002-0002-000000000002', sku: 'FL-50M-006', descripcion: 'Fluorocarbon Leader 50m #6',     cantidad_invoice: 100, cantidad_recibida: 100, diferencia: 0,  precio_unitario_usd: 4.20,  unidad: 'unit' },
      { id: 'stk-0002', remesa_id: 'rem-0002-0002-0002-000000000002', sku: 'FL-50M-008', descripcion: 'Fluorocarbon Leader 50m #8',     cantidad_invoice: 80,  cantidad_recibida: 80,  diferencia: 0,  precio_unitario_usd: 5.10,  unidad: 'unit' },
      { id: 'stk-0003', remesa_id: 'rem-0002-0002-0002-000000000002', sku: 'ML-300M-2',  descripcion: 'Monofilament Line 300m 2lb',    cantidad_invoice: 60,  cantidad_recibida: 58,  diferencia: -2, precio_unitario_usd: 3.80,  unidad: 'spool' },
      { id: 'stk-0004', remesa_id: 'rem-0004-0004-0004-000000000004', sku: 'LR-JS55-BL', descripcion: 'Jig Spinner 55mm Blue',         cantidad_invoice: 200, cantidad_recibida: 200, diferencia: 0,  precio_unitario_usd: 2.40,  unidad: 'unit' },
      { id: 'stk-0005', remesa_id: 'rem-0004-0004-0004-000000000004', sku: 'LR-SW80-RD', descripcion: 'Soft Walker 80mm Red/White',    cantidad_invoice: 150, cantidad_recibida: 147, diferencia: -3, precio_unitario_usd: 3.20,  unidad: 'unit' },
    ], { onConflict: 'id' })

    // ── 7. Alerts ─────────────────────────────────────────────
    await db.from('alertas').upsert([
      { id: 'alr-0001', tipo: 'PROVISION_URGENTE',  mensaje: 'Customs provision DSP-2026-00138 due in 2 days — CLP 2,400,000 pending transfer', urgente: true,  leida: false, destinatario: 'hector',    remesa_id: 'rem-0003-0003-0003-000000000003', created_at: new Date().toISOString() },
      { id: 'alr-0002', tipo: 'SALDO_PENDIENTE',    mensaje: 'Balance payment pending for FW-2026-0142 — USD 2,940 (70%)', urgente: false, leida: false, destinatario: 'hector',    remesa_id: 'rem-0001-0001-0001-000000000001', created_at: new Date(Date.now() - 3600000).toISOString() },
      { id: 'alr-0003', tipo: 'DIFERENCIA_STOCK',   mensaje: 'Stock difference detected in TM-2026-0088: ML-300M-2 received 58 vs 60 ordered, SW80-RD received 147 vs 150', urgente: false, leida: false, destinatario: 'sebastian', remesa_id: 'rem-0002-0002-0002-000000000002', created_at: new Date(Date.now() - 7200000).toISOString() },
    ], { onConflict: 'id' })

    // ── 8. Agent logs ─────────────────────────────────────────
    const now = Date.now()
    await db.from('agent_logs').upsert([
      { id: 'log-001', agent_name: 'invoice_intake',     accion: 'EMAIL_CLASSIFIED',        resultado: 'SUCCESS',  remesa_id: 'rem-0001-0001-0001-000000000001', payload: { invoice_number: 'FW-2026-0142', supplier: 'FishWorld Trading Co.', amount_usd: 4200, confidence: 0.97 },      created_at: new Date(now - 5 * 3600000).toISOString() },
      { id: 'log-002', agent_name: 'invoice_intake',     accion: 'REMESA_CREATED',          resultado: 'SUCCESS',  remesa_id: 'rem-0001-0001-0001-000000000001', payload: { remesa_id: 'rem-0001-0001-0001-000000000001', status: 'INVOICE_RECIBIDO' },                               created_at: new Date(now - 5 * 3600000 + 30000).toISOString() },
      { id: 'log-003', agent_name: 'invoice_intake',     accion: 'EMAIL_CLASSIFIED',        resultado: 'SUCCESS',  remesa_id: 'rem-0005-0005-0005-000000000005', payload: { invoice_number: 'TM-2026-0071', supplier: 'Tokyo Marine Supply', amount_jpy: 1200000, confidence: 0.95 },  created_at: new Date(now - 2 * 3600000).toISOString() },
      { id: 'log-004', agent_name: 'customs_funds',      accion: 'PROVISION_DETECTED',      resultado: 'SUCCESS',  remesa_id: 'rem-0003-0003-0003-000000000003', payload: { dispatch: 'DSP-2026-00138', amount_clp: 2400000, urgente: true, days_until_due: 2 },                      created_at: new Date(now - 1 * 3600000).toISOString() },
      { id: 'log-005', agent_name: 'customs_funds',      accion: 'ALERT_CREATED',           resultado: 'SUCCESS',  remesa_id: 'rem-0003-0003-0003-000000000003', payload: { alert_type: 'PROVISION_URGENTE', notified: ['hector', 'sebastian'] },                                     created_at: new Date(now - 1 * 3600000 + 15000).toISOString() },
      { id: 'log-006', agent_name: 'din_reconciliation', accion: 'DIN_PROCESSED',           resultado: 'SUCCESS',  remesa_id: 'rem-0004-0004-0004-000000000004', payload: { din: '025-2026-11110000-D', provision_paid: 1850000, actual_cost: 1820000, difference: 30000, status: 'SALDO_FAVOR' }, created_at: new Date(now - 24 * 3600000).toISOString() },
      { id: 'log-007', agent_name: 'landed_cost',        accion: 'COSTO_CALCULADO',         resultado: 'SUCCESS',  remesa_id: 'rem-0004-0004-0004-000000000004', payload: { total_cif_usd: 3600, customs_clp: 252000, iva_clp: 380000, agency_clp: 150000, landed_cost_per_unit_usd: 22.40 }, created_at: new Date(now - 23 * 3600000).toISOString() },
      { id: 'log-008', agent_name: 'invoice_intake',     accion: 'EMAIL_CLASSIFIED',        resultado: 'SUCCESS',  remesa_id: 'rem-0002-0002-0002-000000000002', payload: { invoice_number: 'TM-2026-0088', supplier: 'Tokyo Marine Supply', amount_jpy: 850000, confidence: 0.94 },   created_at: new Date(now - 48 * 3600000).toISOString() },
      { id: 'log-009', agent_name: 'customs_funds',      accion: 'PROVISION_DETECTED',      resultado: 'SUCCESS',  remesa_id: 'rem-0002-0002-0002-000000000002', payload: { dispatch: 'DSP-2026-00142', amount_clp: 1850000, urgente: true, days_until_due: 1 },                      created_at: new Date(now - 36 * 3600000).toISOString() },
      { id: 'log-010', agent_name: 'nota_debito',        accion: 'NOTA_DEBITO_PROCESADA',   resultado: 'SUCCESS',  remesa_id: 'rem-0004-0004-0004-000000000004', payload: { factura: 'FA-2026-0088', monto_clp: 150000, proveedor: 'Agencia Aduanera Demo' },                         created_at: new Date(now - 22 * 3600000).toISOString() },
    ], { onConflict: 'id' })

    return NextResponse.json({ ok: true, seeded: { suppliers: 3, remesas: 5, payments: 8, documents: 7, stock: 5, alerts: 3, logs: 10 } })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
