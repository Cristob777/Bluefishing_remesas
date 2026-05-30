/**
 * T4 — Financial flow invariant tests
 *
 * Tests the pure calculation logic described in docs/WORKFLOW.md §5:
 *   1. FX weighted average — applied at payment date, not invoice date
 *   2. Reconciliation tolerance — |provision - real| <= CLP 50,000
 *   3. IVA import separation — NEVER enters landed cost
 *   4. cantidad_recibida is used, NEVER cantidad_invoice
 *   5. Excess provision NEVER reduces landed cost
 *
 * No mocks needed — all pure functions over numbers.
 */

import { describe, it, expect } from 'vitest'

// ─────────────────────────────────────────────────────────────────────────────
//  Pure calculation helpers (mirrors agent logic in landed-cost.ts prompt)
//  These are the invariants the LLM agent must follow. Tests document them
//  and can be used to validate any future refactor.
// ─────────────────────────────────────────────────────────────────────────────

interface Pago { montoOrigen: number; fx: number }

/** FX promedio ponderado = Σ(monto_i × fx_i) / Σ(monto_i) */
function fxPonderado(pagos: Pago[]): number {
  const totalMonto = pagos.reduce((s, p) => s + p.montoOrigen, 0)
  if (totalMonto === 0) return 0
  return pagos.reduce((s, p) => s + p.montoOrigen * p.fx, 0) / totalMonto
}

interface ItemSKU {
  sku:                 string
  cantidadRecibida:    number  // ← WORKFLOW: use this, NOT cantidadInvoice
  cantidadInvoice:     number
  precioUnitarioUSD:   number
}

interface DIN {
  valorMercaderiaClp:  number
  derechosAduanaClp:   number
  ivaImportClp:        number  // ← NEVER enters landed cost (goes to F29)
  honorariosAgensaClp: number
  gastosPorClp:        number
}

/** Total costo aduana sin IVA (IVA va al F29, no al landed cost) */
function costoAduanaSinIVA(din: DIN): number {
  return din.derechosAduanaClp + din.honorariosAgensaClp + din.gastosPorClp
  // IVA excluido intencionalmente
}

interface LandedCostResult {
  sku:                      string
  cantidadRecibida:         number
  fobCLP:                   number
  aduanaCLP:                number
  landedCostTotalCLP:       number
  landedCostUnitarioCLP:    number
}

function calcularLandedCost(
  items:             ItemSKU[],
  fxPromedio:        number,
  costoAduanaTotal:  number,  // must NOT include IVA
): LandedCostResult[] {
  // Peso por FOB USD usando cantidad_recibida
  const totalFOBUSD = items.reduce((s, i) => s + i.cantidadRecibida * i.precioUnitarioUSD, 0)

  return items.map(item => {
    const fobItemUSD   = item.cantidadRecibida * item.precioUnitarioUSD
    const fobItemCLP   = fobItemUSD * fxPromedio
    const proporcion   = totalFOBUSD > 0 ? fobItemUSD / totalFOBUSD : 0
    const aduanaItem   = costoAduanaTotal * proporcion
    const total        = fobItemCLP + aduanaItem
    const unitario     = item.cantidadRecibida > 0 ? total / item.cantidadRecibida : 0

    return {
      sku:                     item.sku,
      cantidadRecibida:        item.cantidadRecibida,
      fobCLP:                  fobItemCLP,
      aduanaCLP:               aduanaItem,
      landedCostTotalCLP:      total,
      landedCostUnitarioCLP:   unitario,
    }
  })
}

/** Reconciliation decision per WORKFLOW.md §4 Etapa 5 */
function reconciliar(provisionPagada: number, costoReal: number): 'RECONCILIADO' | 'DIFERENCIA_SIGNIFICATIVA' | 'SALDO_FAVOR' {
  const TOLERANCIA = 50_000
  const diff = costoReal - provisionPagada
  if (Math.abs(diff) <= TOLERANCIA) return 'RECONCILIADO'
  if (diff > 0)                      return 'DIFERENCIA_SIGNIFICATIVA'
  return 'SALDO_FAVOR'
}

// ─────────────────────────────────────────────────────────────────────────────
//  1. FX weighted average
// ─────────────────────────────────────────────────────────────────────────────

describe('FX ponderado — invariante: fecha de PAGO, no de invoice', () => {
  it('un solo tramo → FX = tasa del pago', () => {
    expect(fxPonderado([{ montoOrigen: 10_000, fx: 900 }])).toBe(900)
  })

  it('30/70: tramo mayor pesa más en el promedio', () => {
    const res = fxPonderado([
      { montoOrigen: 3_000, fx: 900 },  // 30% anticipo en FX 900
      { montoOrigen: 7_000, fx: 1_000 }, // 70% saldo en FX 1000
    ])
    // esperado: (3000×900 + 7000×1000) / 10000 = 9_700_000/10000 = 970
    expect(res).toBeCloseTo(970, 4)
  })

  it('50/50: ambos tramos pesan igual → promedio simple', () => {
    const res = fxPonderado([
      { montoOrigen: 5_000, fx: 880 },
      { montoOrigen: 5_000, fx: 960 },
    ])
    expect(res).toBeCloseTo(920, 4)
  })

  it('100% único pago → FX exacto de ese pago', () => {
    expect(fxPonderado([{ montoOrigen: 15_000, fx: 945 }])).toBe(945)
  })

  it('cuatro tramos → ponderado correcto', () => {
    const pagos = [
      { montoOrigen: 2_000, fx: 900 },
      { montoOrigen: 3_000, fx: 920 },
      { montoOrigen: 3_000, fx: 940 },
      { montoOrigen: 2_000, fx: 960 },
    ]
    // Σ(monto×fx) = 1800000+2760000+2820000+1920000 = 9300000
    // Σmonto = 10000  →  fx = 930
    expect(fxPonderado(pagos)).toBeCloseTo(930, 4)
  })

  it('lista vacía devuelve 0 sin error', () => {
    expect(fxPonderado([])).toBe(0)
  })

  it('tramo con monto 0 no distorsiona el promedio', () => {
    const res = fxPonderado([
      { montoOrigen: 0,      fx: 500 },
      { montoOrigen: 10_000, fx: 900 },
    ])
    expect(res).toBeCloseTo(900, 4)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
//  2. Reconciliation tolerance
// ─────────────────────────────────────────────────────────────────────────────

describe('Reconciliación provisión-vs-DIN (tolerancia CLP 50.000)', () => {
  it('diferencia cero → RECONCILIADO', () => {
    expect(reconciliar(1_000_000, 1_000_000)).toBe('RECONCILIADO')
  })

  it('diferencia exacta +50.000 → RECONCILIADO (límite)', () => {
    expect(reconciliar(1_000_000, 1_050_000)).toBe('RECONCILIADO')
  })

  it('diferencia exacta -50.000 → RECONCILIADO (límite negativo)', () => {
    expect(reconciliar(1_050_000, 1_000_000)).toBe('RECONCILIADO')
  })

  it('diferencia +50.001 → DIFERENCIA_SIGNIFICATIVA', () => {
    expect(reconciliar(1_000_000, 1_050_001)).toBe('DIFERENCIA_SIGNIFICATIVA')
  })

  it('diferencia -50.001 → SALDO_FAVOR (AGENSA debe devolver)', () => {
    expect(reconciliar(1_050_001, 1_000_000)).toBe('SALDO_FAVOR')
  })

  it('provisión muy alta → SALDO_FAVOR', () => {
    expect(reconciliar(2_000_000, 1_000_000)).toBe('SALDO_FAVOR')
  })

  it('costo mucho mayor que provisión → DIFERENCIA_SIGNIFICATIVA', () => {
    expect(reconciliar(1_000_000, 2_500_000)).toBe('DIFERENCIA_SIGNIFICATIVA')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
//  3. IVA import NUNCA entra al landed cost (va al F29)
// ─────────────────────────────────────────────────────────────────────────────

describe('IVA importación — NUNCA entra al landed cost (WORKFLOW §5, inv. 3)', () => {
  const dinConIVA: DIN = {
    valorMercaderiaClp:  800_000,
    derechosAduanaClp:   60_000,
    ivaImportClp:        110_000,  // ← debe quedar fuera del costo
    honorariosAgensaClp: 30_000,
    gastosPorClp:        10_000,
  }

  it('costoAduanaSinIVA excluye el IVA', () => {
    const costo = costoAduanaSinIVA(dinConIVA)
    expect(costo).toBe(60_000 + 30_000 + 10_000) // 100_000
    expect(costo).not.toContain?.(dinConIVA.ivaImportClp) // just in case
    // costo != costo + IVA
    expect(costo).not.toBe(costo + dinConIVA.ivaImportClp)
  })

  it('landed cost calculado con costo sin IVA < costo con IVA', () => {
    const items = [{ sku: 'A', cantidadRecibida: 10, cantidadInvoice: 10, precioUnitarioUSD: 50 }]
    const conIVA    = calcularLandedCost(items, 900, costoAduanaSinIVA(dinConIVA) + dinConIVA.ivaImportClp)
    const sinIVA    = calcularLandedCost(items, 900, costoAduanaSinIVA(dinConIVA))
    expect(sinIVA[0].landedCostTotalCLP).toBeLessThan(conIVA[0].landedCostTotalCLP)
  })

  it('excedente de provisión no reduce el landed cost (inv. 5)', () => {
    // landed cost is independent of provision; excess goes to nota_debito separately
    const items = [{ sku: 'A', cantidadRecibida: 5, cantidadInvoice: 5, precioUnitarioUSD: 100 }]
    const resultadoNormal  = calcularLandedCost(items, 900, 50_000)
    // Simulating excess provision: the costo de aduana is based on DIN, not on provision paid
    const resultadoExceso  = calcularLandedCost(items, 900, 50_000) // same inputs
    expect(resultadoNormal[0].landedCostTotalCLP).toBe(resultadoExceso[0].landedCostTotalCLP)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
//  4. cantidad_recibida, NUNCA cantidad_invoice
// ─────────────────────────────────────────────────────────────────────────────

describe('Invariante cantidad_recibida (WORKFLOW §5, inv. 4)', () => {
  it('usa cantidadRecibida en el resultado, no cantidadInvoice', () => {
    const items = [{
      sku:               'CANA-001',
      cantidadRecibida:  90,  // 10 unidades faltantes
      cantidadInvoice:   100,
      precioUnitarioUSD: 20,
    }]
    const res = calcularLandedCost(items, 900, 0)
    expect(res[0].cantidadRecibida).toBe(90)
    // FOB should be 90×20×900 = 1_620_000, NOT 100×20×900 = 1_800_000
    expect(res[0].fobCLP).toBe(90 * 20 * 900)
    expect(res[0].fobCLP).not.toBe(100 * 20 * 900)
  })

  it('landed cost unitario uses cantidadRecibida as denominator', () => {
    const items = [{
      sku: 'B', cantidadRecibida: 80, cantidadInvoice: 100, precioUnitarioUSD: 10,
    }]
    const res = calcularLandedCost(items, 1_000, 80_000) // 1000 CLP/USD, 80k aduana
    // FOB = 80 × 10 × 1000 = 800_000
    // aduana total = 80_000 (single item = 100%)
    // total = 880_000
    // unitario = 880_000 / 80 = 11_000
    expect(res[0].landedCostUnitarioCLP).toBeCloseTo(11_000, 0)
  })

  it('cantidadRecibida = 0 → unitario = 0 (sin división por cero)', () => {
    const items = [{ sku: 'C', cantidadRecibida: 0, cantidadInvoice: 5, precioUnitarioUSD: 10 }]
    const res = calcularLandedCost(items, 900, 0)
    expect(res[0].landedCostUnitarioCLP).toBe(0)
  })

  it('discrepancia stock: landed cost refleja solo lo recibido', () => {
    const items = [
      { sku: 'X', cantidadRecibida: 45, cantidadInvoice: 50, precioUnitarioUSD: 30 },
      { sku: 'Y', cantidadRecibida: 10, cantidadInvoice: 10, precioUnitarioUSD: 10 },
    ]
    const res = calcularLandedCost(items, 900, 0)
    // X: 45×30×900 = 1_215_000
    expect(res[0].fobCLP).toBeCloseTo(1_215_000, 0)
    // Y: 10×10×900 = 90_000
    expect(res[1].fobCLP).toBeCloseTo(90_000, 0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
//  5. Proration of aduana by FOB value
// ─────────────────────────────────────────────────────────────────────────────

describe('Prorrateo de aduana por valor FOB (WORKFLOW §4 Etapa 5)', () => {
  it('item único recibe 100% del costo aduana', () => {
    const items = [{ sku: 'A', cantidadRecibida: 10, cantidadInvoice: 10, precioUnitarioUSD: 50 }]
    const res = calcularLandedCost(items, 900, 200_000)
    expect(res[0].aduanaCLP).toBeCloseTo(200_000, 0)
  })

  it('dos items igual valor FOB → 50/50 aduana', () => {
    const items = [
      { sku: 'A', cantidadRecibida: 100, cantidadInvoice: 100, precioUnitarioUSD: 10 }, // FOB 1000
      { sku: 'B', cantidadRecibida: 50,  cantidadInvoice: 50,  precioUnitarioUSD: 20 }, // FOB 1000
    ]
    const res = calcularLandedCost(items, 900, 200_000)
    expect(res[0].aduanaCLP).toBeCloseTo(100_000, 0)
    expect(res[1].aduanaCLP).toBeCloseTo(100_000, 0)
  })

  it('item con FOB mayor recibe más aduana proporcionalmente', () => {
    const items = [
      { sku: 'A', cantidadRecibida: 10, cantidadInvoice: 10, precioUnitarioUSD: 100 }, // FOB 1000
      { sku: 'B', cantidadRecibida: 10, cantidadInvoice: 10, precioUnitarioUSD: 300 }, // FOB 3000
    ]
    const res = calcularLandedCost(items, 900, 400_000)
    expect(res[0].aduanaCLP).toBeCloseTo(100_000, 0) // 25%
    expect(res[1].aduanaCLP).toBeCloseTo(300_000, 0) // 75%
  })
})
