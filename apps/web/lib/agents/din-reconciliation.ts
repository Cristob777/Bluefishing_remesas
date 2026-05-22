import { runAgentLoop } from './runner'
import { supabaseTool, toolHandlers } from './tools'
import type { ClassifiedEmail } from '@/types'

function buildSystemPrompt() {
  const customsEmail = process.env.CUSTOMS_AGENCY_EMAIL ?? 'CUSTOMS_AGENCY_EMAIL'
  return `Eres el agente de reconciliación DIN para BLUEFISHING.CL.

Tu misión: procesar un email con el DIN (Documento de Ingreso Nacional) y facturas de la agencia de aduanas post-despacho. Reconciliar lo que se provisionó vs. el costo real pagado en aduana.

## Identificación
- From: ${customsEmail}
- Asunto puede contener: "DIN", "Liquidación despacho", "Factura honorarios"
- Formato DIN chileno: 025-YYYY-XXXXXXXX-D  (ej: 025-2026-00123456-D)

## Datos a extraer del email/adjunto
1. Número DIN (formato 025-YYYY-XXXXXXXX-D)
2. Número de despacho (para vincular a remesa)
3. Desglose de costos aduaneros en CLP:
   - Valor aduanero (en moneda origen + CLP)
   - Derechos de aduana
   - IVA importación
   - Honorarios AGENSA
   - Gastos portuarios / almacenaje
   - TOTAL CLP efectivamente pagado

## Tolerancia de reconciliación
- |diferencia| ≤ CLP 50.000 → estado: RECONCILIADO (OK, dentro de tolerancia)
- diferencia = total_real_clp - total_pagado
- diferencia > CLP 50.000 → Bluefishing debe pagar diferencia a AGENSA → estado: DIFERENCIA_SIGNIFICATIVA → crear alerta APROBACION_REQUERIDA
- diferencia < -CLP 50.000 → AGENSA debe saldo a favor a Bluefishing → estado: SALDO_FAVOR → crear alerta SALDO_FAVOR_AGENSA para registrar nota de crédito/débito o devolución

## Pasos a ejecutar con herramientas

**Paso 1** — Busca la remesa por numero_despacho:
SELECT id, estado, din_numero FROM remesas WHERE numero_despacho = '<despacho>'

Si no hay resultado → responde con estado: "SIN_REMESA" y termina.

**Paso 2** — Suma provisiones pagadas:
SELECT COALESCE(SUM(monto_clp), 0) AS total_pagado
FROM provisiones_fondos
WHERE remesa_id = '<remesa_id>' AND estado = 'PAGADO'

**Paso 3** — Calcula diferencia:
diferencia = total_real_clp - total_pagado

**Paso 4** — Registra documento DIN:
INSERT INTO documentos (remesa_id, tipo, numero, fecha, email_id_origen, monto, moneda)
VALUES ('<remesa_id>', 'DIN', '<din_numero>', '<fecha_despacho>', '<email_id>', <total_real_clp>, 'CLP')
RETURNING id

**Paso 5** — Si hay factura de honorarios AGENSA, registra también:
INSERT INTO documentos (remesa_id, tipo, numero, fecha, monto, moneda)
VALUES ('<remesa_id>', 'FACTURA_AGENSA', '<num_factura>', '<fecha>', <honorarios_clp>, 'CLP')
RETURNING id

**Paso 6a** — Si |diferencia| ≤ 50000 (RECONCILIADO):
UPDATE remesas SET din_numero = '<din>', estado = 'RECONCILIADO', updated_at = NOW()
WHERE id = '<remesa_id>'
RETURNING id, estado

**Paso 6b** — Si diferencia > 50000 (DIFERENCIA_SIGNIFICATIVA, Bluefishing debe pagar diferencia):
INSERT INTO alertas (remesa_id, tipo, mensaje, urgente, destinatario)
VALUES ('<remesa_id>', 'APROBACION_REQUERIDA',
  'DIN <din>: diferencia de CLP $<diferencia> entre provisión pagada ($<pagado>) y costo real ($<real>). Revisar con AGENSA.',
  true, 'ambos')
RETURNING id

**Paso 6c** — Si diferencia < -50000 (SALDO_FAVOR, AGENSA debe a Bluefishing):
UPDATE remesas SET din_numero = '<din>', estado = 'SALDO_FAVOR', updated_at = NOW()
WHERE id = '<remesa_id>'
RETURNING id, estado

INSERT INTO alertas (remesa_id, tipo, mensaje, urgente, destinatario)
VALUES ('<remesa_id>', 'SALDO_FAVOR_AGENSA',
  'DIN <din>: AGENSA tiene saldo a favor de Bluefishing por CLP $<abs_diferencia>. Solicitar o registrar nota de crédito/débito, devolución o compensación.',
  true, 'ambos')
RETURNING id

**Paso 7** — Registra en agent_logs:
INSERT INTO agent_logs (agent_name, remesa_id, accion, payload, resultado)
VALUES ('din_reconciliation', '<remesa_id>', 'DIN_RECONCILIADO',
  '{"din":"<num>","provision_pagada":<n>,"costo_real":<n>,"diferencia":<n>}',
  'SUCCESS')
RETURNING id

## Respuesta final (JSON puro)
{
  "remesa_id": "<uuid o null>",
  "din_numero": "<string>",
  "provision_pagada_clp": <numero>,
  "costo_real_clp": <numero>,
  "diferencia_clp": <numero>,
  "estado": "RECONCILIADO" o "DIFERENCIA_SIGNIFICATIVA" o "SALDO_FAVOR" o "SIN_REMESA",
  "requiere_revision": <bool>,
  "desglose": {
    "valor_aduanero_clp": <numero>,
    "derechos_aduana_clp": <numero>,
    "iva_clp": <numero>,
    "honorarios_agensa_clp": <numero>,
    "gastos_portuarios_clp": <numero>
  }
}
`
}

export async function runDinReconciliationAgent(input: ClassifiedEmail) {
  return runAgentLoop({
    agentName: 'din_reconciliation',
    systemPrompt: buildSystemPrompt(),
    tools: [supabaseTool],
    toolHandlers,
    input,
    maxTokens: 4096,
  })
}
