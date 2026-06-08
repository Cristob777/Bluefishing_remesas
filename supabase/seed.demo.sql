-- ============================================================
-- SYNTHETIC DEMO DATA — NOT for production.
-- All suppliers, invoices, amounts, names, emails and dispatch
-- numbers are completely fictional. No real business data.
-- ============================================================

-- ─── Proveedores ficticios ───────────────────────────────────
INSERT INTO proveedores (id, nombre, pais, moneda, contacto_nombre, contacto_email) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'FishWorld Trading Co.',   'China',  'USD', 'Coco Chan',    'coco@fishworld-trading.com'),
  ('a1000000-0000-0000-0000-000000000002', 'Supplier Alpha (JP)',      'Japón',  'JPY', 'Kenji Tanaka', 'kenji@supplier-alpha.jp'),
  ('a1000000-0000-0000-0000-000000000003', 'Supplier Beta (US)',       'USA',    'USD', 'Mark Rivera',  'mark@supplierbeta.com'),
  ('a1000000-0000-0000-0000-000000000004', 'Pacific Tackle Exports',  'China',  'USD', 'Wei Liu',      'wei@pacifictackle.cn');

-- ─── Remesa 1: PAGO_PENDIENTE ────────────────────────────────
-- Invoice recibido, instrucción de pago emitida, esperando orden bancaria
INSERT INTO remesas (id, proveedor_id, numero_invoice, estado, moneda_origen, monto_original, condicion_pago, fecha_invoice, notas) VALUES
  ('b2000000-0000-0000-0000-000000000001',
   'a1000000-0000-0000-0000-000000000001',
   'FW-2026-0142', 'PAGO_PENDIENTE', 'USD', 4200.00,
   '30/70', '2026-05-20',
   'Spinning reels XP-200 y XP-300. Anticipo 30% pendiente.');

INSERT INTO pagos (remesa_id, tipo, monto_moneda_origen, moneda, estado, created_by) VALUES
  ('b2000000-0000-0000-0000-000000000001', 'ANTICIPO', 1260.00, 'USD', 'PENDIENTE', 'hector'),
  ('b2000000-0000-0000-0000-000000000001', 'SALDO',    2940.00, 'USD', 'PENDIENTE', 'hector');

INSERT INTO documentos (remesa_id, tipo, numero, email_id_origen, fecha, monto, moneda) VALUES
  ('b2000000-0000-0000-0000-000000000001', 'INVOICE', 'FW-2026-0142', 'demo-invoice-fw-2026-0142', '2026-05-20', 4200.00, 'USD');

INSERT INTO alertas (remesa_id, tipo, mensaje, urgente, destinatario) VALUES
  ('b2000000-0000-0000-0000-000000000001', 'PAGO_PENDIENTE',
   'Invoice FW-2026-0142 de FishWorld Trading Co. — pagar USD 1,260 anticipo (30%). Condición 30/70.',
   false, 'finance');

-- ─── Remesa 2: EN_ADUANA ─────────────────────────────────────
-- Pagos confirmados, mercadería en tránsito, provisión AGENSA pendiente
INSERT INTO remesas (id, proveedor_id, numero_invoice, estado, moneda_origen, monto_original, condicion_pago, numero_despacho, fecha_invoice, notas) VALUES
  ('b2000000-0000-0000-0000-000000000002',
   'a1000000-0000-0000-0000-000000000002',
   'SA-JP-2026-0088', 'EN_ADUANA', 'JPY', 680000.00,
   '100%', 'DSP-2026-00088', '2026-04-10',
   'Cañas de pesca fibra de carbono serie Kenshin. Pago único confirmado.');

INSERT INTO pagos (remesa_id, tipo, monto_moneda_origen, moneda, monto_clp, fx_rate, fx_fecha, estado, orden_pago_numero, fecha_emision, fecha_confirmacion, created_by) VALUES
  ('b2000000-0000-0000-0000-000000000002', 'UNICO', 680000.00, 'JPY', 3672000, 5.4000, '2026-04-15', 'CONFIRMADO', 'SWIFT-2026-00441', '2026-04-14', '2026-04-15', 'hector');

INSERT INTO documentos (remesa_id, tipo, numero, email_id_origen, fecha, monto, moneda) VALUES
  ('b2000000-0000-0000-0000-000000000002', 'INVOICE', 'SA-JP-2026-0088', 'demo-invoice-sa-jp-0088', '2026-04-10', 680000.00, 'JPY');

INSERT INTO provisiones_fondos (remesa_id, numero_despacho, monto_clp, fecha_vencimiento, es_urgente, estado, email_id_origen) VALUES
  ('b2000000-0000-0000-0000-000000000002', 'DSP-2026-00088', 1240000, '2026-06-12', true, 'PENDIENTE', 'demo-provision-dsp-00088');

INSERT INTO alertas (remesa_id, tipo, mensaje, urgente, destinatario) VALUES
  ('b2000000-0000-0000-0000-000000000002', 'PROVISION_URGENTE',
   '⚠ Provisión fondos despacho DSP-2026-00088 vence en 4 días — CLP $1.240.000',
   true, 'finance');

-- ─── Remesa 3: RECONCILIADO ──────────────────────────────────
-- Ciclo completo: invoice → pagos → aduana → DIN → landed cost
INSERT INTO remesas (id, proveedor_id, numero_invoice, estado, moneda_origen, monto_original, condicion_pago, numero_despacho, din_numero, fecha_invoice, notas) VALUES
  ('b2000000-0000-0000-0000-000000000003',
   'a1000000-0000-0000-0000-000000000003',
   'SB-US-2025-0331', 'RECONCILIADO', 'USD', 8750.00,
   '50/50', 'DSP-2025-00331', '025-2025-00331789-D', '2025-11-03',
   'Señuelos premium serie BlueWater. Reconciliado dentro de tolerancia.');

INSERT INTO pagos (remesa_id, tipo, monto_moneda_origen, moneda, monto_clp, fx_rate, fx_fecha, estado, orden_pago_numero, fecha_emision, fecha_confirmacion, created_by) VALUES
  ('b2000000-0000-0000-0000-000000000003', 'ANTICIPO', 4375.00, 'USD', 4243750, 970.00, '2025-11-10', 'CONFIRMADO', 'SWIFT-2025-01102', '2025-11-09', '2025-11-10', 'hector'),
  ('b2000000-0000-0000-0000-000000000003', 'SALDO',    4375.00, 'USD', 4375000, 1000.00, '2025-12-02', 'CONFIRMADO', 'SWIFT-2025-01388', '2025-12-01', '2025-12-02', 'hector');

INSERT INTO provisiones_fondos (remesa_id, numero_despacho, monto_clp, fecha_vencimiento, es_urgente, estado, email_id_origen, paid_at) VALUES
  ('b2000000-0000-0000-0000-000000000003', 'DSP-2025-00331', 1920000, '2025-12-08', false, 'PAGADO', 'demo-provision-dsp-00331', '2025-12-05 14:30:00+00');

INSERT INTO documentos (remesa_id, tipo, numero, email_id_origen, fecha, monto, moneda) VALUES
  ('b2000000-0000-0000-0000-000000000003', 'INVOICE',        'SB-US-2025-0331',    'demo-invoice-sb-us-0331', '2025-11-03', 8750.00,   'USD'),
  ('b2000000-0000-0000-0000-000000000003', 'DIN',            '025-2025-00331789-D','demo-din-0331',           '2025-12-10', 1890000.0, 'CLP'),
  ('b2000000-0000-0000-0000-000000000003', 'FACTURA_AGENSA', 'FA-DEMO-2025-0331',  'demo-fa-0331',            '2025-12-10', 142000.0,  'CLP');

INSERT INTO alertas (remesa_id, tipo, mensaje, urgente, leida, leida_at) VALUES
  ('b2000000-0000-0000-0000-000000000003', 'PAGO_PENDIENTE',
   'Remesa SB-US-2025-0331 reconciliada. DIN 025-2025-00331789-D registrado. Diferencia CLP 30.000 dentro de tolerancia.',
   false, true, now());

-- ─── agent_logs de muestra ───────────────────────────────────
INSERT INTO agent_logs (agent_name, remesa_id, accion, payload, resultado) VALUES
  ('invoice_intake', 'b2000000-0000-0000-0000-000000000001', 'INVOICE_PROCESADO',
   '{"invoice_numero":"FW-2026-0142","proveedor":"FishWorld Trading Co.","monto":4200,"moneda":"USD"}'::jsonb, 'SUCCESS'),
  ('invoice_intake', 'b2000000-0000-0000-0000-000000000002', 'INVOICE_PROCESADO',
   '{"invoice_numero":"SA-JP-2026-0088","proveedor":"Supplier Alpha (JP)","monto":680000,"moneda":"JPY"}'::jsonb, 'SUCCESS'),
  ('customs_funds',  'b2000000-0000-0000-0000-000000000002', 'PROVISION_PROCESADA',
   '{"numero_despacho":"DSP-2026-00088","monto_clp":1240000,"es_urgente":true}'::jsonb, 'SUCCESS'),
  ('din_reconciliation', 'b2000000-0000-0000-0000-000000000003', 'DIN_RECONCILIADO',
   '{"din":"025-2025-00331789-D","provision_pagada":1920000,"costo_real":1890000,"diferencia":-30000}'::jsonb, 'SUCCESS'),
  ('landed_cost',    'b2000000-0000-0000-0000-000000000003', 'LANDED_COST_CALCULADO',
   '{"costo_total_clp":10498750,"fx_promedio_ponderado":985}'::jsonb, 'SUCCESS');
