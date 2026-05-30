/**
 * Tests for nota-debito.ts — verifies it uses the shared SQL sandbox
 * (ALLOWED_VERBS + FORBIDDEN regex from tools.ts), NOT an inline Supabase client.
 *
 * Regression guard: if nota-debito ever reverts to creating its own client
 * and calling rpc('run_sql') directly (without validation), these tests catch it.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock the runner so we can inspect what toolHandlers are passed ──────────

let capturedHandlers: Record<string, (input: unknown) => Promise<unknown>> = {}
let capturedTools: unknown[] = []

vi.mock('./runner', () => ({
  runAgentLoop: vi.fn(async (params: {
    agentName: string
    systemPrompt: string
    tools: unknown[]
    toolHandlers: Record<string, (input: unknown) => Promise<unknown>>
    input: unknown
  }) => {
    capturedHandlers = params.toolHandlers
    capturedTools    = params.tools
    return { session_id: 'test-session', agent_name: params.agentName, status: 'completed', result: null }
  }),
}))

// ── Mock Supabase singleton used by shared tools.ts ──────────────────────────

vi.mock('../supabase', () => ({
  db: {
    rpc: vi.fn(async () => ({ data: [], error: null })),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(async () => ({ data: null })),
      upsert: vi.fn(async () => ({ error: null })),
    })),
  },
}))

import { runNotaDebitoAgent } from './nota-debito'
import { handleSupabaseSQL }  from './tools'

// ── Helpers ──────────────────────────────────────────────────────────────────

const MOCK_EMAIL = {
  email_id:       'msg-001',
  email_from:     'customs@example.com',
  email_subject:  'Nota de crédito NC-2026-042 — despacho DSP-26-001234',
  email_body:     'Estimados, adjuntamos nota de crédito NC-2026-042 por CLP $48.500.',
  account:        'ops',
  category:       'NOTA_DEBITO_AGENSA' as const,
  confidence:     0.95,
  extracted_data: {},
}

beforeEach(() => {
  capturedHandlers = {}
  capturedTools    = []
  vi.clearAllMocks()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('nota-debito agent — SQL sandbox', () => {
  it('registers supabase_execute_sql tool (same name as other agents)', async () => {
    await runNotaDebitoAgent(MOCK_EMAIL)
    const toolNames = (capturedTools as Array<{ name: string }>).map(t => t.name)
    expect(toolNames).toContain('supabase_execute_sql')
  })

  it('uses shared toolHandlers (not an inline client)', async () => {
    await runNotaDebitoAgent(MOCK_EMAIL)
    // The shared handler is handleSupabaseSQL exported from tools.ts.
    // We verify the passed handler is functionally equivalent by checking
    // it rejects forbidden SQL (which the inline client would execute blindly).
    const handler = capturedHandlers['supabase_execute_sql']
    expect(handler).toBeDefined()

    const res = await handler({ sql: 'DROP TABLE remesas' }) as { error: string }
    expect(res.error).toBeTruthy()
  })

  it('shared handler blocks DDL — DROP TABLE', async () => {
    await runNotaDebitoAgent(MOCK_EMAIL)
    const res = await capturedHandlers['supabase_execute_sql']({ sql: 'DROP TABLE remesas' }) as { error: string }
    expect(res.error).toMatch(/Only SELECT/i)
  })

  it('shared handler blocks inline SQL comments (--)', async () => {
    await runNotaDebitoAgent(MOCK_EMAIL)
    const res = await capturedHandlers['supabase_execute_sql']({ sql: 'SELECT 1 -- drop table' }) as { error: string }
    expect(res.error).toMatch(/Disallowed/i)
  })

  it('shared handler blocks multi-statement injection', async () => {
    await runNotaDebitoAgent(MOCK_EMAIL)
    const res = await capturedHandlers['supabase_execute_sql']({
      sql: "SELECT 1; DELETE FROM agent_logs WHERE 1=1",
    }) as { error: string }
    expect(res.error).toMatch(/Disallowed/i)
  })

  it('shared handler allows valid SELECT', async () => {
    await runNotaDebitoAgent(MOCK_EMAIL)
    const res = await capturedHandlers['supabase_execute_sql']({
      sql: "SELECT id FROM remesas WHERE numero_despacho = 'DSP-001'",
    }) as { error?: string }
    expect(res.error).toBeUndefined()
  })

  it('shared handler allows INSERT with RETURNING', async () => {
    await runNotaDebitoAgent(MOCK_EMAIL)
    const res = await capturedHandlers['supabase_execute_sql']({
      sql: "INSERT INTO documentos (tipo, numero, moneda) VALUES ('NOTA_CREDITO', 'NC-001', 'CLP') RETURNING id",
    }) as { error?: string }
    expect(res.error).toBeUndefined()
  })

  it('nota-debito does NOT have its own supabase-js import (no inline client)', async () => {
    // The fix: nota-debito.ts must NOT dynamically import @supabase/supabase-js.
    // We verify by checking that the handler is the shared one from tools.ts —
    // the shared handler uses the db singleton, not a freshly created client.
    await runNotaDebitoAgent(MOCK_EMAIL)
    const handler = capturedHandlers['supabase_execute_sql']

    // Shared handler (handleSupabaseSQL) rejects empty SQL.
    // Inline handler would just call rpc() and likely succeed or fail differently.
    const emptyRes = await handler({ sql: '' }) as { error: string }
    expect(emptyRes.error).toMatch(/Empty SQL/i)
  })
})

describe('nota-debito agent — invocation shape', () => {
  it('calls runAgentLoop with agentName nota_debito', async () => {
    const { runAgentLoop } = await import('./runner')
    await runNotaDebitoAgent(MOCK_EMAIL)
    expect(runAgentLoop).toHaveBeenCalledWith(
      expect.objectContaining({ agentName: 'nota_debito' })
    )
  })

  it('passes the classified email as input', async () => {
    const { runAgentLoop } = await import('./runner')
    await runNotaDebitoAgent(MOCK_EMAIL)
    expect(runAgentLoop).toHaveBeenCalledWith(
      expect.objectContaining({ input: MOCK_EMAIL })
    )
  })

  it('returns the runner result unchanged', async () => {
    const result = await runNotaDebitoAgent(MOCK_EMAIL)
    expect(result.status).toBe('completed')
    expect(result.agent_name).toBe('nota_debito')
  })
})
