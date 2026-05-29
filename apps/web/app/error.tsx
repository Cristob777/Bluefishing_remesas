'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app-error]', error)
  }, [error])

  return (
    <div
      className="min-h-screen flex items-center justify-center p-8"
      style={{ background: 'var(--bg-subtle)' }}
    >
      <div className="text-center max-w-md">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'var(--danger-bg)' }}
        >
          <AlertTriangle size={22} style={{ color: 'var(--danger)' }} />
        </div>
        <h1 className="t-h2 mb-2">Algo salió mal</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--fg-3)' }}>
          Ocurrió un error inesperado. Puedes intentar de nuevo o contactar soporte.
        </p>
        {error.digest && (
          <p className="t-mono-sm mb-4" style={{ color: 'var(--fg-4)' }}>
            ID: {error.digest}
          </p>
        )}
        <button onClick={reset} className="btn btn--primary">
          Intentar de nuevo
        </button>
      </div>
    </div>
  )
}
