'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Package,
  Zap,
  Bot,
  FileText,
  GitBranch,
  Settings,
  Command,
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { KBarSearch, useKBar } from '@/components/ui/KBarSearch'

const AGENTS = ['invoice_intake', 'customs_funds', 'din_reconciliation', 'nota_debito', 'landed_cost']
const AGENT_COLORS = ['#4F46E5', '#D97706', '#7C3AED', '#C2410C', '#059669']

const NAV = [
  { href: '/dashboard/overview', label: 'Resumen',       Icon: LayoutDashboard },
  { href: '/dashboard/remesas',  label: 'Remesas',       Icon: ArrowLeftRight },
  { href: '/dashboard/stock',    label: 'Stock',         Icon: Package },
  { href: '/dashboard/actions',  label: 'Acciones',      Icon: Zap, badgeKey: 'actions' },
  { href: '/dashboard/agents',    label: 'Agentes',       Icon: Bot },
  { href: '/dashboard/documentos', label: 'Documentos',  Icon: FileText },
  { href: '/dashboard/reglas',    label: 'Reglas',       Icon: GitBranch },
  { href: '/dashboard/settings', label: 'Configuración', Icon: Settings },
]

export function SidebarNav() {
  const pathname          = usePathname()
  const { open, setOpen } = useKBar()
  const [pendingCount, setPendingCount] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/actions/pending')
      .then(r => r.json())
      .then(d => setPendingCount(d?.total ?? 0))
      .catch(() => setPendingCount(null))
  }, [])

  return (
    <>
      <KBarSearch open={open} onClose={() => setOpen(false)} />

      {/* Logo */}
      <div
        className="flex items-center gap-3 px-5 py-5 border-b"
        style={{ borderColor: '#E7E5E4' }}
      >
        <div
          className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #4F46E5, #4338CA)' }}
        >
          <Logo size={24} />
        </div>
        <div>
          <p className="font-bold text-[13px] leading-tight tracking-tight" style={{ color: '#0A0A0A' }}>
            BLUEFISHING
          </p>
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] leading-tight" style={{ color: '#A3A3A3' }}>
            Agentes de IA
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        <p className="nav-section-label">Menú</p>
        <div className="space-y-0.5">
          {NAV.map(({ href, label, Icon, badgeKey }) => {
            const isActive = pathname?.startsWith(href)
            const count    = badgeKey === 'actions' ? pendingCount : null
            return (
              <Link
                key={href}
                href={href}
                className={clsx('nav-item', isActive && 'nav-item-active')}
              >
                <Icon size={15} className="flex-shrink-0" style={{ opacity: isActive ? 1 : 0.6 }} />
                <span className="flex-1 text-[13px]">{label}</span>
                {count != null && count > 0 && (
                  <span
                    className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white"
                    style={{ background: '#DC2626', boxShadow: '0 1px 3px rgba(220,38,38,0.3)' }}
                  >
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        {/* Agent heartbeat section */}
        <p className="nav-section-label mt-2">Sistema</p>
        <div
          className="rounded-lg px-3 py-2.5 space-y-2"
          style={{ background: '#FAFAF9', border: '1px solid #E7E5E4' }}
        >
          {AGENTS.map((agent, i) => (
            <div key={agent} className="flex items-center gap-2">
              <span
                className="rounded-full animate-pulse-dot flex-shrink-0"
                style={{ width: 6, height: 6, background: AGENT_COLORS[i], animationDelay: `${i * 280}ms`, display: 'inline-block' }}
              />
              <span className="text-[11px] capitalize" style={{ color: '#A3A3A3' }}>
                {agent.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
        </div>
      </nav>

      {/* Cmd+K hint */}
      <button
        onClick={() => setOpen(true)}
        className="mx-3 mb-3 flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-150"
        style={{
          background: '#F5F5F4',
          border: '1px solid #E7E5E4',
          color: '#A3A3A3',
        }}
      >
        <Command size={12} />
        <span className="text-[11px] flex-1 text-left">Búsqueda rápida</span>
        <kbd className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#E7E5E4', color: '#A3A3A3' }}>⌘K</kbd>
      </button>

      {/* User footer */}
      <div
        className="px-5 py-4 border-t"
        style={{ borderColor: '#E7E5E4' }}
      >
        <div
          className="flex items-center gap-2.5 p-2 rounded-lg"
          style={{ background: '#FAFAF9' }}
        >
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: '#FFF' }}
          >
            {(process.env.NEXT_PUBLIC_OWNER_DISPLAY ?? 'Ad').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold leading-tight truncate" style={{ color: '#0A0A0A' }}>
              {process.env.NEXT_PUBLIC_OWNER_DISPLAY ?? 'Admin'}
            </p>
            <p className="text-[10px] leading-tight" style={{ color: '#A3A3A3' }}>
              {process.env.NEXT_PUBLIC_COMPANY_DISPLAY ?? 'Operaciones de Importación'}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
