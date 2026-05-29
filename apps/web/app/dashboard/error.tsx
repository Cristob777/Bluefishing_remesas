'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import Link from 'next/link'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[dashboard-error]', error)
  }, [error])

  return (
    <div className="dashboard-page flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'var(--danger-bg)' }}
        >
          <AlertTriangle size={22} style={{ color: 'var(--danger)' }} />
        </div>
        <h2 className="t-h2 mb-2">Error al cargar</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--fg-3)' }}>
          No se pudo cargar esta sección. Revisa tu conexión o intenta de nuevo.
        </p>
        {error.digest && (
          <p className="t-mono-sm mb-4" style={{ color: 'var(--fg-4)' }}>
            ID: {error.digest}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="btn btn--primary">
            <RefreshCw size={13} />
            Reintentar
          </button>
          <Link href="/dashboard/overview" className="btn btn--ghost">
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
