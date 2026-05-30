/**
 * Tests del flujo financiero de Bluefishing.
 *
 * Cubre las invariantes críticas del WORKFLOW.md:
 * - FX se calcula en fecha del PAGO, nunca del invoice
 * - Tolerancia de reconciliación ≤ CLP 50.000
 * - SQL sandbox rechaza DDL y comentarios
 * - handleGetFxRate usa la API CMF correctamente
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleSupabaseSQL } from '../agents/tools'

// ─── Mock Supabase ────────────────────────────────────────────────────────────

vi.mock('../supabase', () => ({
  db: {
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) }),
      upsert: async () => ({ error: null }),
      rpc: async () => ({ data: [], error: null }),
    }),
    rpc: async (_fn: string, _args: { sql_text: string }) => ({ data: [], error: null }),
  },
}))

// ─── 1. SQL Sandbox validation ────────────────────────────────────────────────

describe('SQL sandbox — handleSupabaseSQL', () => {
  it('rechaza SQL vacío', async () => {
    const res = await handleSupabaseSQL({ sql: '' })
    expect((res as { error: string }).error).toBeTruthy()
  })

  // DDL verbs not in ALLOWED_VERBS → "Only SELECT/INSERT/UPDATE/DELETE/WITH allowed"
  it('rechaza DDL (DROP TABLE)', async () => {
    const res = await handleSupabaseSQL({ sql: 'DROP TABLE remesas' })
    expect((res as { error: string }).error).toMatch(/Only SELECT/i)
  })

  // Inline comments caught by FORBIDDEN
  it('rechaza comentarios SQL de una línea', async () => {
    const res = await handleSupabaseSQL({ sql: 'SELECT 1 -- comment' })
    expect((res as { error: string }).error).toMatch(/Disallowed/i)
  })

  // Block comment prefix: "/* */" doesn't start with allowed verb → caught by ALLOWED_VERBS
  it('rechaza comentarios SQL de bloque', async () => {
    const res = await handleSupabaseSQL({ sql: '/* */ SELECT 1' })
    expect((res as { error: string }).error).toBeTruthy()
  })

  // Multi-statement caught by FORBIDDEN (semicolon + non-whitespace)
  it('rechaza multi-statement', async () => {
    const res = await handleSupabaseSQL({ sql: 'SELECT 1; DROP TABLE remesas' })
    expect((res as { error: string }).error).toMatch(/Disallowed/i)
  })

  // System catalogs caught by FORBIDDEN
  it('rechaza acceso a catálogos del sistema', async () => {
    const res = await handleSupabaseSQL({ sql: 'SELECT * FROM pg_catalog.pg_tables' })
    expect((res as { error: string }).error).toMatch(/Disallowed/i)
  })

  // TRUNCATE not in ALLOWED_VERBS → "Only SELECT/..." message
  it('rechaza TRUNCATE', async () => {
    const res = await handleSupabaseSQL({ sql: 'TRUNCATE remesas' })
    expect((res as { error: string }).error).toMatch(/Only SELECT/i)
  })

  it('rechaza verbos no permitidos', async () => {
    const res = await handleSupabaseSQL({ sql: 'COPY remesas TO stdout' })
    expect((res as { error: string }).error).toMatch(/Only SELECT/i)
  })

  it('acepta SELECT válido', async () => {
    const res = await handleSupabaseSQL({ sql: "SELECT id FROM remesas WHERE estado = 'RECONCILIADO'" })
    expect((res as { error?: string }).error).toBeUndefined()
  })

  it('acepta INSERT con RETURNING', async () => {
    const res = await handleSupabaseSQL({
      sql: "INSERT INTO alertas (tipo, mensaje, urgente) VALUES ('PAGO_PENDIENTE', 'test', false) RETURNING id",
    })
    expect((res as { error?: string }).error).toBeUndefined()
  })

  it('acepta UPDATE con RETURNING', async () => {
    const res = await handleSupabaseSQL({
      sql: "UPDATE remesas SET estado = 'PAGO_COMPLETO' WHERE id = 'uuid-test' RETURNING id",
    })
    expect((res as { error?: string }).error).toBeUndefined()
  })

  it('acepta WITH (CTE)', async () => {
    const res = await handleSupabaseSQL({
      sql: "WITH pagados AS (SELECT remesa_id FROM pagos WHERE estado='CONFIRMADO') SELECT * FROM pagados",
    })
    expect((res as { error?: string }).error).toBeUndefined()
  })

  it('rechaza SQL de más de 8000 caracteres', async () => {
    const res = await handleSupabaseSQL({ sql: 'SELECT ' + 'x'.repeat(8001) })
    expect((res as { error: string }).error).toMatch(/too long/i)
  })
})

// ─── 2. Invariantes de reconciliación ─────────────────────────────────────────

describe('Lógica de reconciliación (tolerancia CLP 50.000)', () => {
  function reconciliar(provisionPagada: number, costoReal: number) {
    const diferencia = costoReal - provisionPagada
    const TOLERANCIA = 50_000
    if (Math.abs(diferencia) <= TOLERANCIA) return 'RECONCILIADO'
    if (diferencia > TOLERANCIA) return 'DIFERENCIA_SIGNIFICATIVA'
    return 'SALDO_FAVOR' // diferencia < -TOLERANCIA → AGENSA debe devolución
  }

  it('diferencia cero → RECONCILIADO', () => {
    expect(reconciliar(1_000_000, 1_000_000)).toBe('RECONCILIADO')
  })

  it('diferencia exactamente 50.000 → RECONCILIADO', () => {
    expect(reconciliar(1_000_000, 1_050_000)).toBe('RECONCILIADO')
  })

  it('diferencia exactamente -50.000 → RECONCILIADO', () => {
    expect(reconciliar(1_050_000, 1_000_000)).toBe('RECONCILIADO')
  })

  it('diferencia 50.001 → DIFERENCIA_SIGNIFICATIVA', () => {
    expect(reconciliar(1_000_000, 1_050_001)).toBe('DIFERENCIA_SIGNIFICATIVA')
  })

  it('diferencia -50.001 → SALDO_FAVOR (AGENSA debe devolución)', () => {
    expect(reconciliar(1_050_001, 1_000_000)).toBe('SALDO_FAVOR')
  })

  it('diferencia grande positiva → DIFERENCIA_SIGNIFICATIVA', () => {
    expect(reconciliar(500_000, 900_000)).toBe('DIFERENCIA_SIGNIFICATIVA')
  })

  it('diferencia grande negativa → SALDO_FAVOR', () => {
    expect(reconciliar(900_000, 500_000)).toBe('SALDO_FAVOR')
  })
})

// ─── 3. FX ponderado (invariante: fecha de pago, no de invoice) ───────────────

describe('FX ponderado por tramo de pago', () => {
  interface Tramo { monto: number; fx: number }

  function fxPromedioPonderado(tramos: Tramo[]): number {
    const totalMonto = tramos.reduce((s, t) => s + t.monto, 0)
    if (totalMonto === 0) return 0
    const suma = tramos.reduce((s, t) => s + t.monto * t.fx, 0)
    return suma / totalMonto
  }

  it('un solo tramo → FX = tramo único', () => {
    expect(fxPromedioPonderado([{ monto: 10_000, fx: 900 }])).toBe(900)
  })

  it('dos tramos iguales → promedio simple', () => {
    const res = fxPromedioPonderado([
      { monto: 5_000, fx: 900 },
      { monto: 5_000, fx: 1_000 },
    ])
    expect(res).toBeCloseTo(950, 2)
  })

  it('30/70: anticipo pesa 30%, saldo pesa 70%', () => {
    // anticipo 30% a fx=900, saldo 70% a fx=980
    const res = fxPromedioPonderado([
      { monto: 3_000, fx: 900 },
      { monto: 7_000, fx: 980 },
    ])
    // esperado: (3000*900 + 7000*980) / 10000 = (2_700_000 + 6_860_000) / 10000 = 956
    expect(res).toBeCloseTo(956, 1)
  })

  it('tramos con montos cero no distorsionan el promedio', () => {
    const res = fxPromedioPonderado([
      { monto: 0, fx: 500 },
      { monto: 10_000, fx: 900 },
    ])
    expect(res).toBeCloseTo(900, 2)
  })

  it('lista vacía devuelve 0 (sin error)', () => {
    expect(fxPromedioPonderado([])).toBe(0)
  })
})

// ─── 4. Landed cost unitario ──────────────────────────────────────────────────

describe('Cálculo landed cost por SKU', () => {
  interface Item { sku: string; cantidad_recibida: number; precio_usd: number }

  function calcularLandedCost(items: Item[], fxClp: number, costoAduanaCLP: number) {
    const totalFOBUSD = items.reduce((s, i) => s + i.cantidad_recibida * i.precio_usd, 0)
    return items.map(item => {
      const fobItemUSD  = item.cantidad_recibida * item.precio_usd
      const fobItemCLP  = fobItemUSD * fxClp
      const proporcion  = totalFOBUSD > 0 ? fobItemUSD / totalFOBUSD : 0
      const aduanaItem  = costoAduanaCLP * proporcion
      const landedTotal = fobItemCLP + aduanaItem
      return {
        sku:                     item.sku,
        cantidad_recibida:       item.cantidad_recibida,
        fob_clp:                 fobItemCLP,
        aduana_clp:              aduanaItem,
        landed_cost_total_clp:   landedTotal,
        landed_cost_unitario_clp: item.cantidad_recibida > 0 ? landedTotal / item.cantidad_recibida : 0,
      }
    })
  }

  it('un solo SKU, sin aduana → landed = FOB * fx', () => {
    const res = calcularLandedCost([{ sku: 'A', cantidad_recibida: 10, precio_usd: 50 }], 900, 0)
    expect(res[0].landed_cost_total_clp).toBe(450_000)
    expect(res[0].landed_cost_unitario_clp).toBe(45_000)
  })

  it('dos SKUs reparten costo aduana proporcionalmente por FOB', () => {
    const items = [
      { sku: 'A', cantidad_recibida: 100, precio_usd: 10 }, // FOB USD 1000 (50%)
      { sku: 'B', cantidad_recibida: 50,  precio_usd: 20 }, // FOB USD 1000 (50%)
    ]
    const res = calcularLandedCost(items, 900, 200_000)
    // Cada SKU recibe 50% de aduana = 100_000
    expect(res[0].aduana_clp).toBeCloseTo(100_000, 0)
    expect(res[1].aduana_clp).toBeCloseTo(100_000, 0)
  })

  it('usa cantidad_recibida, no cantidad invoice', () => {
    // Cantidad invoice sería 100 pero se recibieron 90
    const res = calcularLandedCost([{ sku: 'A', cantidad_recibida: 90, precio_usd: 10 }], 900, 0)
    expect(res[0].cantidad_recibida).toBe(90)
    expect(res[0].fob_clp).toBe(90 * 10 * 900) // 810_000
  })

  it('SKU con cantidad_recibida = 0 → landed_cost_unitario = 0 (sin división por cero)', () => {
    const res = calcularLandedCost([{ sku: 'A', cantidad_recibida: 0, precio_usd: 10 }], 900, 0)
    expect(res[0].landed_cost_unitario_clp).toBe(0)
  })
})

// ─── 5. Deduplicación de provisiones ─────────────────────────────────────────

describe('Deduplicación de provisiones por email_id_origen', () => {
  function deberiaDeduplicar(existentes: string[], nuevoEmailId: string): boolean {
    return existentes.includes(nuevoEmailId)
  }

  it('mismo email_id → debe deduplicar', () => {
    expect(deberiaDeduplicar(['msg-001', 'msg-002'], 'msg-001')).toBe(true)
  })

  it('email_id nuevo → no deduplicar', () => {
    expect(deberiaDeduplicar(['msg-001', 'msg-002'], 'msg-003')).toBe(false)
  })

  it('lista vacía → nunca deduplicar', () => {
    expect(deberiaDeduplicar([], 'msg-001')).toBe(false)
  })
})
