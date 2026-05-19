// Centralised audit logger — all agent_logs writes go through here.
// Failures are swallowed (logs must never block business logic),
// but errors are captured so callers can optionally inspect them.

import { db } from '@/lib/supabase'

export interface AuditEntry {
  agent_name:    string
  session_id?:   string | null
  remesa_id?:    string | null
  accion:        string
  payload?:      Record<string, unknown> | null
  resultado:     'SUCCESS' | 'ERROR' | 'PENDING_APPROVAL'
  error_mensaje?: string | null
}

export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await db.from('agent_logs').insert(entry)
  } catch {
    // Intentionally silent — audit failures must not interrupt business logic
  }
}

// Convenience helpers
export const auditOk  = (base: Omit<AuditEntry, 'resultado'>) =>
  audit({ ...base, resultado: 'SUCCESS' })

export const auditErr = (base: Omit<AuditEntry, 'resultado'>, error: unknown) =>
  audit({
    ...base,
    resultado:     'ERROR',
    error_mensaje: error instanceof Error ? error.message : String(error),
  })
