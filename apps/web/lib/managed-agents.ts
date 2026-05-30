import type { AgentName, EmailCategory, ClassifiedEmail } from '@/types'
import type { AgentRunResult } from './agents/runner'
import { audit } from './audit'
import { db } from './supabase'
import { runInvoiceIntakeAgent }    from './agents/invoice-intake'
import { runCustomsFundsAgent }     from './agents/customs-funds'
import { runDinReconciliationAgent } from './agents/din-reconciliation'
import { runNotaDebitoAgent }       from './agents/nota-debito'
import { runLandedCostAgent }       from './agents/landed-cost'

// ── T2: INSTRUCCION_PAGO — no-agent path (option c per WORKFLOW.md §4 Etapa 2) ──
// When Sebastian emails Hector with payment instructions, we record the event
// and create an urgent alert. No AI agent is invoked — etapa 2 is deliberately manual.

export interface InstruccionPagoPayload {
  emailId:      string
  emailFrom:    string
  emailSubject: string
  remesaId:     string | null
}

export async function handleInstruccionPago(payload: InstruccionPagoPayload): Promise<void> {
  await audit({
    agent_name: 'webhook',
    accion:     'INSTRUCCION_PAGO_RECIBIDA',
    payload: {
      email_id:  payload.emailId,
      from:      payload.emailFrom,
      subject:   payload.emailSubject,
      remesa_id: payload.remesaId,
    },
    resultado:     'PENDING_APPROVAL',
    error_mensaje: 'INSTRUCCION_PAGO recibida — requiere acción humana',
  })

  await db.from('alertas').insert({
    tipo:         'INSTRUCCION_PAGO',
    mensaje:      `Instrucción de pago de ${payload.emailFrom}: "${payload.emailSubject}". Registrar condición y emitir orden.`,
    urgente:      true,
    destinatario: 'finance',
    remesa_id:    payload.remesaId,
  })
}

// ── T3: Chain retry with 3-attempt exponential backoff ───────────────────────
// Exported with _testOnly_ prefix so tests can call it directly without going
// through the full agent pipeline.

const MAX_RETRIES   = 3
const BASE_DELAY_MS = 1000 // 1s → 2s → 4s (exponential)

async function alertChainFailed(
  agentName: string,
  sessionId: string,
  remesaId:  string | null | undefined,
  reason:    string,
) {
  await audit({
    agent_name: agentName,
    session_id: sessionId,
    remesa_id:  remesaId ?? undefined,
    accion:     'CHAIN_ABORTED',
    payload:    { reason },
    resultado:  'ERROR',
  })
  await db.from('alertas').insert({
    tipo:         'CADENA_FALLIDA',
    mensaje:      `Cadena ${agentName}→landed_cost abortó tras ${MAX_RETRIES} intentos. ${reason}. Session: ${sessionId}.`,
    urgente:      true,
    destinatario: 'ambos',
    remesa_id:    remesaId ?? null,
  })
}

export async function _testOnly_runLandedCostWithRetry(
  remesaId:  string,
  agentName: string,
  sessionId: string,
): Promise<void> {
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await runLandedCostAgent({ remesa_id: remesaId })
      return // success — stop
    } catch (err) {
      lastError = err
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1) // 1s, 2s (before attempt 3)
        await new Promise(r => setTimeout(r, delay))
      }
    }
  }

  // All attempts exhausted
  const reason = `landed_cost falló tras ${MAX_RETRIES} intentos: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  await alertChainFailed(agentName, sessionId, remesaId, reason)
}

// Keep the original name as an alias so the rest of managed-agents uses it.
const runLandedCostWithRetry = _testOnly_runLandedCostWithRetry

export interface AgentTriggerResult {
  session_id: string
  agent_name: AgentName
  status: 'triggered' | 'error'
  error?: string
}

// ── Declarative registry ──────────────────────────────────────────────────────

type AgentRunner = (input: ClassifiedEmail) => Promise<AgentRunResult>

interface AgentEntry {
  run:       AgentRunner
  onSuccess?: (result: AgentRunResult) => Promise<void>
}

const AGENT_REGISTRY: Record<AgentName, AgentEntry> = {
  invoice_intake: {
    run: runInvoiceIntakeAgent,
  },
  customs_funds: {
    run: runCustomsFundsAgent,
  },
  din_reconciliation: {
    run: runDinReconciliationAgent,
    onSuccess: async (result) => {
      const res = result.result
      const ok  = res !== null && typeof res === 'object' && !Array.isArray(res) && 'estado' in (res as object)
      if (!ok) {
        await alertChainFailed('din_reconciliation', result.session_id, null, 'result missing expected {estado} field')
        return
      }
      const typed = res as { estado?: string; remesa_id?: string }
      if (typed.estado === 'RECONCILIADO' && typed.remesa_id) {
        await runLandedCostWithRetry(typed.remesa_id, 'din_reconciliation', result.session_id)
      }
    },
  },
  nota_debito: {
    run: runNotaDebitoAgent,
    onSuccess: async (result) => {
      const res = result.result
      const ok  = res !== null && typeof res === 'object' && !Array.isArray(res) && 'estado' in (res as object)
      if (!ok) {
        await alertChainFailed('nota_debito', result.session_id, null, 'result missing expected {estado} field')
        return
      }
      const typed = res as { estado?: string; remesa_id?: string }
      if (typed.estado === 'RECONCILIADO' && typed.remesa_id) {
        await runLandedCostWithRetry(typed.remesa_id, 'nota_debito', result.session_id)
      }
    },
  },
  landed_cost: {
    run: (input) => runLandedCostAgent(input as unknown as { remesa_id: string }),
  },
}

// ── Category → agent mapping ──────────────────────────────────────────────────

const CATEGORY_MAP: Partial<Record<EmailCategory, AgentName>> = {
  INVOICE_PROVEEDOR:  'invoice_intake',
  PROVISION_FONDOS:   'customs_funds',
  DIN_DESPACHO:       'din_reconciliation',
  NOTA_DEBITO_AGENSA: 'nota_debito',
}

export function categoryToAgent(category: EmailCategory): AgentName | null {
  return CATEGORY_MAP[category] ?? null
}

// ── Orchestrator ──────────────────────────────────────────────────────────────

export async function triggerAgent(
  agentName: AgentName,
  input: ClassifiedEmail,
): Promise<AgentTriggerResult> {
  const entry = AGENT_REGISTRY[agentName]
  if (!entry) {
    return { session_id: '', agent_name: agentName, status: 'error', error: `Unknown agent: ${agentName}` }
  }

  try {
    const result = await entry.run(input)
    if (result.status === 'completed') {
      await entry.onSuccess?.(result)
    }
    return {
      session_id: result.session_id,
      agent_name: agentName,
      status:     result.status === 'completed' ? 'triggered' : 'error',
      error:      result.error,
    }
  } catch (err) {
    return {
      session_id: '',
      agent_name: agentName,
      status:     'error',
      error:      err instanceof Error ? err.message : String(err),
    }
  }
}
