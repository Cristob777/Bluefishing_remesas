/**
 * Synthetic email fixtures for the public portfolio demo.
 *
 * ALL data is 100% fictional: supplier names, emails, invoice numbers,
 * dispatch numbers, amounts and contacts are invented for demonstration
 * purposes. No real business data is present.
 *
 * Categories are pre-resolved (not run through classifyEmail) so the demo
 * works with only ANTHROPIC_API_KEY + Supabase keys configured — no
 * SUPPLIER_NAMES or ALLOWED_EMAIL_DOMAINS required.
 */

import type { EmailCategory } from '@/types'

export interface DemoFixture {
  id:               string
  label:            string
  category:         EmailCategory
  supplierName:     string
  supplierCountry:  string
  supplierCurrency: string
  supplierEmail:    string
  payload: {
    email_id:             string
    email_from:           string
    email_to:             string
    email_subject:        string
    email_body:           string
    email_date:           string
    account:              string
    attachment_filename?: string
    attachment_count:     number
  }
}

export const DEMO_FIXTURES: DemoFixture[] = [
  {
    id:               'invoice-cn-1',
    label:            'Invoice proveedor',
    category:         'INVOICE_PROVEEDOR',
    supplierName:     'FishWorld Trading Co.',
    supplierCountry:  'China',
    supplierCurrency: 'USD',
    supplierEmail:    'coco@fishworld-trading.com',
    payload: {
      email_id:     'demo-invoice-fw-2026-0142',
      email_from:   'coco@fishworld-trading.com',
      email_to:     'ops@demoimport.cl',
      email_subject: 'Invoice FW-2026-0142 — Fishing Reels',
      email_body: `Dear Import Team,

Please find below our commercial invoice for your recent order.

INVOICE NO: FW-2026-0142
DATE: 2026-06-05
SELLER: FishWorld Trading Co., Guangzhou, China

ITEMS:
  SKU: REEL-XP200  | Spinning Reel XP-200 | Qty: 50 | Unit: USD 45.00 | Total: USD 2,250.00
  SKU: REEL-XP300  | Spinning Reel XP-300 | Qty: 30 | Unit: USD 65.00 | Total: USD 1,950.00

SUBTOTAL: USD 4,200.00
PAYMENT TERMS: 30% advance (USD 1,260.00) + 70% balance (USD 2,940.00) before shipment
BANK: HSBC Hong Kong — Account: 123-456789-001 — Swift: HSBCHKHHHKH

Kindly arrange the 30% advance to confirm production.

Best regards,
Coco Yao
Sales Manager — FishWorld Trading Co.`,
      email_date:          '2026-06-05T09:15:00.000Z',
      account:             'ops',
      attachment_count:    0,
    },
  },

  {
    id:               'provision-agensa-1',
    label:            'Provisión AGENSA',
    category:         'PROVISION_FONDOS',
    supplierName:     '',
    supplierCountry:  '',
    supplierCurrency: '',
    supplierEmail:    '',
    payload: {
      email_id:     'demo-provision-dsp-2026-00142',
      email_from:   'despachos@aduanademo.cl',
      email_to:     'ops@demoimport.cl',
      email_subject: 'Ag Aduana, Cliente:DEMO IMPORT SPA, solicitud de Fondos despacho:DSP-2026-00142',
      get email_body() {
        const due = new Date(Date.now() + 2 * 86_400_000).toLocaleDateString('es-CL')
        return `Estimado cliente,

Le informamos que para liberar el despacho aduanero se requiere la siguiente provisión de fondos:

DESPACHO: DSP-2026-00142
CLIENTE: DEMO IMPORT SPA
MONTO REQUERIDO: $1.850.000 CLP
FECHA LÍMITE DE PAGO: ${due}
FORMA DE PAGO: Transferencia electrónica

DATOS BANCARIOS:
  Banco Demo Chile — Cta. Corriente 00-9988-77
  RUT: 99.888.777-6

IMPORTANTE: El no pago antes de la fecha límite puede generar gastos de almacenaje adicionales.

Atentamente,
Despachos — Agencia Aduanera Demo`
      },
      email_date:          new Date().toISOString(),
      account:             'ops',
      attachment_count:    0,
    },
  },

  {
    id:               'din-2026-1',
    label:            'DIN y liquidación',
    category:         'DIN_DESPACHO',
    supplierName:     '',
    supplierCountry:  '',
    supplierCurrency: '',
    supplierEmail:    '',
    payload: {
      email_id:     'demo-din-dsp-2026-00142',
      email_from:   'despachos@aduanademo.cl',
      email_to:     'ops@demoimport.cl',
      email_subject: 'Liquidación despacho DSP-2026-00142 — DIN 025-2026-12345678-D',
      email_body: `Estimado cliente,

Adjuntamos la liquidación del despacho DSP-2026-00142 ya regularizado ante el SNA.

DIN: 025-2026-12345678-D
DESPACHO: DSP-2026-00142
FECHA DECLARACIÓN: 2026-06-05

DESGLOSE DE COSTOS REALES:
  Valor aduanero (CIF):        USD 4,200.00
  Derecho aduana (6%):         CLP    252.000
  IVA importación (19%):       CLP    380.000
  Honorarios agencia:          CLP    150.000
  Gastos portuarios:           CLP     38.000
  TOTAL PAGADO EFECTIVO:       CLP  1.820.000

PROVISIÓN PAGADA PREVIAMENTE: CLP  1.850.000
DIFERENCIA (saldo a favor):   CLP     30.000

La diferencia de $30.000 CLP está dentro de la tolerancia acordada.
Queda a su disposición para cualquier consulta.

Atentamente,
Liquidaciones — Agencia Aduanera Demo`,
      email_date:          new Date().toISOString(),
      account:             'ops',
      attachment_count:    0,
    },
  },
]
