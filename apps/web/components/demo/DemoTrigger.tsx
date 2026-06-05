'use client'

import { useState } from 'react'
import { Zap } from 'lucide-react'
import { DEMO_FIXTURES } from '@/lib/demo-fixtures'

type State = 'idle' | 'loading' | 'success' | 'error'

interface Props {
  fixtureId?: string   // default: 'invoice-cn-1'
}

export function DemoTrigger({ fixtureId = 'invoice-cn-1' }: Props) {
  const [state, setState]   = useState<State>('idle')
  const [message, setMessage] = useState('')

  const fixture = DEMO_FIXTURES.find(f => f.id === fixtureId)
  const label   = fixture?.label ?? 'Ver demo'

  async function run() {
    setState('loading')
    setMessage('')
    try {
      const res  = await fetch('/api/demo/process-sample', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ fixture_id: fixtureId }),
      })
      const json = await res.json() as { ok?: boolean; error?: string; label?: string }

      if (res.ok && json.ok) {
        setState('success')
        setMessage(json.label ?? label)
        setTimeout(() => window.location.reload(), 600)
      } else {
        setState('error')
        setMessage((json.error ?? 'Error desconocido').slice(0, 80))
      }
    } catch {
      setState('error')
      setMessage('Error de red')
    }
  }

  if (state === 'success') {
    return (
      <div
        className="btn btn--sm flex items-center gap-1.5"
        style={{ background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success)', cursor: 'default' }}
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <polyline points="2 6 5 9 10 3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {message || label} creada
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={run}
        disabled={state === 'loading'}
        className="btn btn--primary btn--sm flex items-center gap-1.5"
        style={{ opacity: state === 'loading' ? 0.7 : 1, cursor: state === 'loading' ? 'not-allowed' : 'pointer' }}
      >
        {state === 'loading' ? (
          <>
            <div
              className="w-3 h-3 border rounded-full animate-spin"
              style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }}
            />
            Procesando…
          </>
        ) : (
          <>
            <Zap size={11} strokeWidth={2} />
            Ver demo →
          </>
        )}
      </button>
      {state === 'error' && (
        <p className="text-[11px]" style={{ color: 'var(--danger)' }}>{message}</p>
      )}
    </div>
  )
}
