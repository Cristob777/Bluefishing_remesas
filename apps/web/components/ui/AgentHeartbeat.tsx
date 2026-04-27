'use client'

import { useEffect, useState } from 'react'

const AGENTS = [
  { key: 'invoice_intake',     label: 'Invoice Intake',     color: '#4F46E5' },
  { key: 'customs_funds',      label: 'Customs Funds',      color: '#059669' },
  { key: 'din_reconciliation', label: 'DIN Reconciliation', color: '#D97706' },
  { key: 'landed_cost',        label: 'Landed Cost',        color: '#7C3AED' },
]

type AgentStatus = 'idle' | 'running' | 'error'

interface AgentState {
  status: AgentStatus
  lastRun?: string
}

export function AgentHeartbeat() {
  const [states, setStates] = useState<Record<string, AgentState>>({})
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('/api/agents/status')
        if (res.ok) {
          const data = await res.json()
          setStates(data.agents ?? {})
        }
      } catch {
        // default to idle on error
      }
    }
    fetchStatus()
    const interval = setInterval(fetchStatus, 10_000)
    return () => clearInterval(interval)
  }, [])

  function dotColor(key: string, defaultColor: string): string {
    const state = states[key]
    if (!state || state.status === 'idle') return defaultColor
    if (state.status === 'running') return '#F59E0B'
    if (state.status === 'error')   return '#EF4444'
    return defaultColor
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {AGENTS.map((a, i) => (
          <div key={a.key} className="relative" onMouseEnter={() => setHoveredKey(a.key)} onMouseLeave={() => setHoveredKey(null)}>
            <span
              className="rounded-full animate-pulse-dot block"
              style={{
                width: 6,
                height: 6,
                background: dotColor(a.key, a.color),
                animationDelay: `${i * 300}ms`,
              }}
            />
            {hoveredKey === a.key && (
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-medium pointer-events-none z-50"
                style={{ background: '#0A0A0A', color: '#FFF', boxShadow: '0 4px 8px rgba(0,0,0,0.2)' }}
              >
                {a.label}
                {states[a.key]?.lastRun && (
                  <span style={{ color: '#A3A3A3' }}> — {states[a.key]!.lastRun}</span>
                )}
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
                     style={{ borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '4px solid #0A0A0A' }} />
              </div>
            )}
          </div>
        ))}
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
        4 AGENTES
      </span>
    </div>
  )
}
