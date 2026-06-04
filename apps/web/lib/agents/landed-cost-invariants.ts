/**
 * Single source of truth for landed cost invariants.
 *
 * Both the agent system prompt (landed-cost.ts) and the test suite
 * (financial-flow.test.ts) import from here, so the formula cannot
 * silently drift between the two.
 *
 * WORKFLOW.md §5 invariants encoded here:
 *   inv.1  FX at payment date, never invoice date
 *   inv.2  FX weighted average by amount
 *   inv.3  IVA importación NEVER enters landed cost — goes to F29
 *   inv.4  Use cantidad_recibida, never cantidad_invoice
 *   inv.5  Excess provision never reduces landed cost
 *   inv.6  Reconciliation tolerance: |provision - real| ≤ CLP 50,000
 */

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Pago { montoOrigen: number; fx: number }

export interface ItemSKU {
  sku:                string
  cantidadRecibida:   number  // inv.4: use this, NEVER cantidadInvoice
  cantidadInvoice:    number
  precioUnitarioUSD:  number
}

export interface DIN {
  valorMercaderiaClp:  number
  derechosAduanaClp:   number
  ivaImportClp:        number  // inv.3: tracked separately, goes to F29
  honorariosAgensaClp: number
  gastosPorClp:        number
}

export interface LandedCostResult {
  sku:                   string
  cantidadRecibida:      number
  fobCLP:                number
  aduanaCLP:             number
  landedCostTotalCLP:    number
  landedCostUnitarioCLP: number
}

// ─── Pure calculation functions ───────────────────────────────────────────────

/** inv.1+2 — FX weighted average = Σ(monto_i × fx_i) / Σ(monto_i) */
export function fxPonderado(pagos: Pago[]): number {
  const totalMonto = pagos.reduce((s, p) => s + p.montoOrigen, 0)
  if (totalMonto === 0) return 0
  return pagos.reduce((s, p) => s + p.montoOrigen * p.fx, 0) / totalMonto
}

/** inv.3 — Total customs cost WITHOUT IVA (IVA goes to F29, not landed cost) */
export function costoAduanaSinIVA(din: DIN): number {
  return din.derechosAduanaClp + din.honorariosAgensaClp + din.gastosPorClp
  // ivaImportClp excluded intentionally — goes to F29
}

/** inv.4+5 — Landed cost per SKU using cantidad_recibida, prorated by FOB value */
export function calcularLandedCost(
  items:            ItemSKU[],
  fxPromedio:       number,
  costoAduanaTotal: number,  // must NOT include IVA (use costoAduanaSinIVA)
): LandedCostResult[] {
  const totalFOBUSD = items.reduce((s, i) => s + i.cantidadRecibida * i.precioUnitarioUSD, 0)

  return items.map(item => {
    const fobItemUSD = item.cantidadRecibida * item.precioUnitarioUSD
    const fobItemCLP = fobItemUSD * fxPromedio
    const proporcion = totalFOBUSD > 0 ? fobItemUSD / totalFOBUSD : 0
    const aduanaItem = costoAduanaTotal * proporcion
    const total      = fobItemCLP + aduanaItem
    const unitario   = item.cantidadRecibida > 0 ? total / item.cantidadRecibida : 0

    return {
      sku:                   item.sku,
      cantidadRecibida:      item.cantidadRecibida,
      fobCLP:                fobItemCLP,
      aduanaCLP:             aduanaItem,
      landedCostTotalCLP:    total,
      landedCostUnitarioCLP: unitario,
    }
  })
}

/** inv.6 — Reconciliation decision (tolerance CLP 50,000) */
export function reconciliar(
  provisionPagada: number,
  costoReal:       number,
): 'RECONCILIADO' | 'DIFERENCIA_SIGNIFICATIVA' | 'SALDO_FAVOR' {
  const TOLERANCIA = 50_000
  const diff = costoReal - provisionPagada
  if (Math.abs(diff) <= TOLERANCIA) return 'RECONCILIADO'
  if (diff > 0)                      return 'DIFERENCIA_SIGNIFICATIVA'
  return 'SALDO_FAVOR'
}

// ─── Prompt constants (Paso 5 of the agent system prompt) ────────────────────
// These are interpolated directly into landed-cost.ts SYSTEM_PROMPT.
// Changing them here changes both the agent behaviour AND fails the regression tests.

export const STEP5_IVA_NOTE =
  '# IVA importación va al F29 — NUNCA al landed cost (WORKFLOW.md §5 inv.3)' as const

export const STEP5_FORMULA =
  'costo_aduana_total_clp = derechos_aduana + honorarios_agensa + gastos_portuarios' as const

export const STEP5_ALT_FORMULA =
  'costo_aduana_total_clp = total_din_clp - valor_mercaderia_clp_segun_din - iva_clp' as const
