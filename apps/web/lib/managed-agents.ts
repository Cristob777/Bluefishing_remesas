import type { AgentName, EmailCategory, ClassifiedEmail } from '@/types'
import { runInvoiceIntakeAgent } from './agents/invoice-intake'
import { runCustomsFundsAgent } from './agents/customs-funds'
import { runDinReconciliationAgent } from './agents/din-reconciliation'
import { runNotaDebitoAgent } from './agents/nota-debito'
import { runLandedCostAgent } from './agents/landed-cost'

export interface AgentTriggerResult {
  session_id: string
  agent_name: AgentName
  status: 'triggered' | 'error'
  error?: string
}

export async function triggerAgent(
  agentName: AgentName,
  input: ClassifiedEmail
): Promise<AgentTriggerResult> {
  try {
    let result

    switch (agentName) {
      case 'invoice_intake':
        result = await runInvoiceIntakeAgent(input)
        break

      case 'customs_funds':
        result = await runCustomsFundsAgent(input)
        break

      case 'din_reconciliation': {
        result = await runDinReconciliationAgent(input)
        // Chain: if reconciled, immediately trigger landed cost
        const res = result.result as { estado?: string; remesa_id?: string } | undefined
        if (res?.estado === 'RECONCILIADO' && res.remesa_id) {
          await runLandedCostAgent({ remesa_id: res.remesa_id })
        }
        break
      }

      case 'nota_debito':
        result = await runNotaDebitoAgent(input)
        break

      case 'landed_cost':
        // Normally triggered via din_reconciliation chain, but can be called manually
        result = await runLandedCostAgent(
          input as unknown as { remesa_id: string }
        )
        break

      default:
        return {
          session_id: '',
          agent_name: agentName,
          status: 'error',
          error: `Unknown agent: ${agentName}`,
        }
    }

    return {
      session_id: result.session_id,
      agent_name: agentName,
      status: result.status === 'completed' ? 'triggered' : 'error',
      error: result.error,
    }
  } catch (err) {
    return {
      session_id: '',
      agent_name: agentName,
      status: 'error',
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export function categoryToAgent(category: EmailCategory): AgentName | null {
  const map: Partial<Record<EmailCategory, AgentName>> = {
    INVOICE_PROVEEDOR:  'invoice_intake',
    PROVISION_FONDOS:   'customs_funds',
    DIN_DESPACHO:       'din_reconciliation',
    NOTA_DEBITO_AGENSA: 'nota_debito',
  }
  return map[category] ?? null
}
