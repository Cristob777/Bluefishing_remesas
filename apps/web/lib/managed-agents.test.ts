/**
 * Tests for managed-agents.ts
 *
 * Covers:
 *  - T2: INSTRUCCION_PAGO routing (option c — no agent, urgent alert for finance)
 *  - T3: Chain retry with 3-attempt backoff
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockInsert  = vi.fn(async (_data: unknown) => ({ data: [{ id: 'alert-001' }], error: null }))
const mockAudit   = vi.fn(async (_entry: unknown) => {})
const mockRunLC   = vi.fn(async (_input: unknown) => ({ session_id: 's1', agent_name: 'landed_cost', status: 'completed' as const, result: null }))

vi.mock('./audit', () => ({
  audit: (entry: unknown) => mockAudit(entry),
}))

vi.mock('./supabase', () => ({
  db: {
    from: vi.fn(() => ({ insert: mockInsert })),
  },
}))

vi.mock('./agents/landed-cost', () => ({
  runLandedCostAgent: (input: unknown) => mockRunLC(input),
}))

// Stub the other agents so importing managed-agents doesn't blow up
vi.mock('./agents/invoice-intake',     () => ({ runInvoiceIntakeAgent:     vi.fn() }))
vi.mock('./agents/customs-funds',      () => ({ runCustomsFundsAgent:      vi.fn() }))
vi.mock('./agents/din-reconciliation', () => ({ runDinReconciliationAgent: vi.fn() }))
vi.mock('./agents/nota-debito',        () => ({ runNotaDebitoAgent:        vi.fn() }))

// ── Import after mocks ────────────────────────────────────────────────────────

import { categoryToAgent, handleInstruccionPago } from './managed-agents'

// ─────────────────────────────────────────────────────────────────────────────
//  T2 — INSTRUCCION_PAGO routing (option c)
// ─────────────────────────────────────────────────────────────────────────────

describe('T2 — INSTRUCCION_PAGO routing (no-agent path)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('categoryToAgent returns null for INSTRUCCION_PAGO (no AI agent dispatched)', () => {
    expect(categoryToAgent('INSTRUCCION_PAGO')).toBeNull()
  })

  it('handleInstruccionPago is exported from managed-agents', () => {
    // Will fail until the function is extracted from the webhook into managed-agents
    expect(typeof handleInstruccionPago).toBe('function')
  })

  it('creates an INSTRUCCION_PAGO alert with urgente=true', async () => {
    await handleInstruccionPago({
      emailId:      'msg-instruccion-001',
      emailFrom:    'owner@example.com',
      emailSubject: 'Pagar BF-2026-0118 al 30/70',
      remesaId:     'remesa-uuid-001',
    })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo:         'INSTRUCCION_PAGO',
        urgente:      true,
        destinatario: 'finance',
      })
    )
  })

  it('alert includes the email subject in the mensaje', async () => {
    await handleInstruccionPago({
      emailId:      'msg-002',
      emailFrom:    'owner@example.com',
      emailSubject: 'Condición 50/50 factura INV-9900',
      remesaId:     null,
    })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        mensaje: expect.stringContaining('INV-9900'),
      })
    )
  })

  it('sets remesa_id on the alert when provided', async () => {
    await handleInstruccionPago({
      emailId:      'msg-003',
      emailFrom:    'sebastian@example.cl',
      emailSubject: 'pago total',
      remesaId:     'remesa-abc',
    })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ remesa_id: 'remesa-abc' })
    )
  })

  it('sets remesa_id to null when not linked', async () => {
    await handleInstruccionPago({
      emailId:      'msg-004',
      emailFrom:    'sebastian@example.cl',
      emailSubject: 'instruccion sin invoice',
      remesaId:     null,
    })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ remesa_id: null })
    )
  })

  it('logs to agent_logs with PENDING_APPROVAL resultado', async () => {
    await handleInstruccionPago({
      emailId:      'msg-005',
      emailFrom:    'sebastian@example.cl',
      emailSubject: 'test',
      remesaId:     null,
    })

    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        accion:    'INSTRUCCION_PAGO_RECIBIDA',
        resultado: 'PENDING_APPROVAL',
      })
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
//  T3 — Chain retry with 3-attempt backoff
// ─────────────────────────────────────────────────────────────────────────────

// We need to test the retry logic in isolation.
// Import the internal retry helper if exported, or test through the onSuccess path.

import { _testOnly_runLandedCostWithRetry } from './managed-agents'

describe('T3 — runLandedCostWithRetry (3-attempt backoff)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('succeeds on first attempt — no retry needed', async () => {
    mockRunLC.mockResolvedValueOnce({ session_id: 's1', agent_name: 'landed_cost', status: 'completed', result: null })

    const promise = _testOnly_runLandedCostWithRetry('remesa-1', 'din_reconciliation', 'session-1')
    await vi.runAllTimersAsync()
    await promise

    expect(mockRunLC).toHaveBeenCalledTimes(1)
    expect(mockInsert).not.toHaveBeenCalled() // no alert
  })

  it('retries on first failure, succeeds on second attempt', async () => {
    mockRunLC
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce({ session_id: 's1', agent_name: 'landed_cost', status: 'completed', result: null })

    const promise = _testOnly_runLandedCostWithRetry('remesa-1', 'din_reconciliation', 'session-1')
    await vi.runAllTimersAsync()
    await promise

    expect(mockRunLC).toHaveBeenCalledTimes(2)
    expect(mockInsert).not.toHaveBeenCalled() // recovered, no alert
  })

  it('retries on first two failures, succeeds on third attempt', async () => {
    mockRunLC
      .mockRejectedValueOnce(new Error('timeout'))
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce({ session_id: 's1', agent_name: 'landed_cost', status: 'completed', result: null })

    const promise = _testOnly_runLandedCostWithRetry('remesa-1', 'din_reconciliation', 'session-1')
    await vi.runAllTimersAsync()
    await promise

    expect(mockRunLC).toHaveBeenCalledTimes(3)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('creates CADENA_FALLIDA alert after all 3 attempts fail', async () => {
    mockRunLC.mockRejectedValue(new Error('DB unavailable'))

    const promise = _testOnly_runLandedCostWithRetry('remesa-1', 'din_reconciliation', 'session-1')
    await vi.runAllTimersAsync()
    await promise

    expect(mockRunLC).toHaveBeenCalledTimes(3)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'CADENA_FALLIDA', urgente: true })
    )
  })

  it('logs ERROR to agent_logs when all retries exhausted', async () => {
    mockRunLC.mockRejectedValue(new Error('fail'))

    const promise = _testOnly_runLandedCostWithRetry('remesa-2', 'nota_debito', 'session-2')
    await vi.runAllTimersAsync()
    await promise

    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        agent_name: 'nota_debito',
        accion:     'CHAIN_ABORTED',
        resultado:  'ERROR',
      })
    )
  })

  it('uses exponential backoff — delays increase between attempts', async () => {
    mockRunLC.mockRejectedValue(new Error('fail'))
    const delays: number[] = []
    const origSetTimeout = globalThis.setTimeout
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn, delay, ...args) => {
      if (typeof delay === 'number' && delay > 0) delays.push(delay)
      return origSetTimeout(fn as () => void, 0, ...args)
    })

    const promise = _testOnly_runLandedCostWithRetry('remesa-3', 'din_reconciliation', 'session-3')
    await vi.runAllTimersAsync()
    await promise

    // Should have at least 2 delays (between attempts 1→2 and 2→3)
    expect(delays.length).toBeGreaterThanOrEqual(2)
    // Backoff: second delay >= first delay
    if (delays.length >= 2) {
      expect(delays[1]).toBeGreaterThanOrEqual(delays[0])
    }
  })

  it('includes remesa_id in the CADENA_FALLIDA alert', async () => {
    mockRunLC.mockRejectedValue(new Error('fail'))

    const promise = _testOnly_runLandedCostWithRetry('remesa-xyz', 'din_reconciliation', 'session-1')
    await vi.runAllTimersAsync()
    await promise

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ remesa_id: 'remesa-xyz' })
    )
  })
})
