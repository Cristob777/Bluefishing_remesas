'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Bell, ChevronRight, Search } from 'lucide-react'
import { KBarSearch, useKBar } from '@/components/ui/KBarSearch'

const TITLES: Record<string, string> = {
  '/dashboard/overview':   'Resumen',
  '/dashboard/remesas':    'Remesas',
  '/dashboard/stock':      'Stock',
  '/dashboard/actions':    'Acciones',
  '/dashboard/agents':     'Agentes',
  '/dashboard/documentos': 'Documentos',
  '/dashboard/reglas':     'Reglas',
  '/dashboard/settings':   'Configuración',
}

function titleForPath(pathname: string | null) {
  if (!pathname) return 'Dashboard'
  const match = Object.keys(TITLES).find(path => pathname.startsWith(path))
  return match ? TITLES[match] : 'Dashboard'
}

export function DashboardTopbar() {
  const pathname = usePathname()
  const { open, setOpen } = useKBar()
  const [pendingCount, setPendingCount] = useState<number | null>(null)
  const title = titleForPath(pathname)

  useEffect(() => {
    fetch('/api/actions/pending')
      .then(r => r.json())
      .then(d => setPendingCount(d?.total ?? 0))
      .catch(() => setPendingCount(null))
  }, [])

  const initials = (process.env.NEXT_PUBLIC_OWNER_DISPLAY ?? 'Admin')
    .slice(0, 2)
    .toUpperCase()

  return (
    <>
      <KBarSearch open={open} onClose={() => setOpen(false)} />

      <header
        className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b px-7"
        style={{
          background: 'rgba(255,255,255,0.86)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-[13px] font-medium" style={{ color: 'var(--fg-3)' }}>
            Bluefishing CL
          </span>
          <ChevronRight size={13} strokeWidth={1.75} style={{ color: 'var(--fg-4)' }} />
          <span className="truncate text-sm font-semibold" style={{ color: 'var(--fg-1)' }}>
            {title}
          </span>
        </div>

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="hidden w-[320px] items-center gap-2 rounded-lg border px-3 py-1.5 text-left text-xs transition-colors duration-150 md:flex"
          style={{
            background: 'var(--bg-surface)',
            borderColor: 'var(--border-default)',
            color: 'var(--fg-3)',
          }}
        >
          <Search size={14} strokeWidth={1.75} style={{ color: 'var(--fg-4)' }} />
          <span className="flex-1 truncate">Buscar remesa, factura, DIN...</span>
          <kbd>⌘K</kbd>
        </button>

        <button
          type="button"
          className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-150 hover:bg-[var(--bg-hover)]"
          aria-label="Notificaciones"
          style={{ color: 'var(--fg-3)' }}
        >
          <Bell size={15} strokeWidth={1.75} />
          {pendingCount != null && pendingCount > 0 && (
            <span
              className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full"
              style={{ background: 'var(--danger)', border: '2px solid var(--bg-surface)' }}
            />
          )}
        </button>

        <div
          className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-semibold"
          style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}
        >
          {initials}
        </div>
      </header>
    </>
  )
}
