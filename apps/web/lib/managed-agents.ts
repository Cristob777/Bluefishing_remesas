import type { AgentName, EmailCategory, ClassifiedEmail } from '@/types'
import type { AgentRunResult } from './agents/runner'
import { audit } from './audit'
import { runInvoiceIntakeAgent }    from './agents/invoice-intake'
import { runCustomsFundsAgent }     from './agents/customs-funds'
import { runDinReconciliationAgent } from './agents/din-reconciliation'
import { runNotaDebitoAgent }       from './agents/nota-debito'
import { runLandedCostAgent }       from './agents/landed-cost'

export interface AgentTriggerResult {
  session_id: string
  agent_name: AgentName
  status: 'triggered' | 'error'
  error?: string
}

// ── Declarative registry — adding a new agent = one new entry, no switch edits ──

type AgentRunner = (input: ClassifiedEmail) => Promise<AgentRunResult>

interface AgentEntry {
  run:      AgentRunner
  /** Optional: called after a successful run to chain to another agent */
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
      const hasExpectedShape = res !== null && typeof res === 'object' && !Array.isArray(res) && 'estado' in (res as object)
      if (!hasExpectedShape) {
        await audit({ agent_name: 'din_reconciliation', session_id: result.session_id, accion: 'CHAIN_ABORTED', payload: { reason: 'result missing expected {estado} field' }, resultado: 'ERROR' })
        return
      }
      const typed = res as { estado?: string; remesa_id?: string }
      if (typed.estado === 'RECONCILIADO' && typed.remesa_id) {
        await runLandedCostAgent({ remesa_id: typed.remesa_id })
      }
    },
  },
  nota_debito: {
    run: runNotaDebitoAgent,
    onSuccess: async (result) => {
      const res = result.result
      const hasExpectedShape = res !== null && typeof res === 'object' && !Array.isArray(res) && 'estado' in (res as object)
      if (!hasExpectedShape) {
        await audit({ agent_name: 'nota_debito', session_id: result.session_id, accion: 'CHAIN_ABORTED', payload: { reason: 'result missing expected {estado} field' }, resultado: 'ERROR' })
        return
      }
      const typed = res as { estado?: string; remesa_id?: string }
      if (typed.estado === 'RECONCILIADO' && typed.remesa_id) {
        await runLandedCostAgent({ remesa_id: typed.remesa_id })
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
