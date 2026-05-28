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
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'

const AGENTS = ['invoice_intake', 'customs_funds', 'din_reconciliation', 'nota_debito', 'landed_cost']
const AGENT_COLORS = ['#1E8C82', '#D97706', '#4F46E5', '#C2410C', '#059669']

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
  const [pendingCount, setPendingCount] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/actions/pending')
      .then(r => r.json())
      .then(d => setPendingCount(d?.total ?? 0))
      .catch(() => setPendingCount(null))
  }, [])

  return (
    <>
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 py-5"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #2A6CF0, #1E8C82)' }}
        >
          <Logo size={24} />
        </div>
        <div>
          <p className="font-semibold text-[14px] leading-tight tracking-tight" style={{ color: 'var(--fg-1)' }}>
            bluefishing
          </p>
          <p className="text-[10px] leading-tight" style={{ color: 'var(--fg-4)' }}>
            Importadora SpA
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
                    className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold text-white"
                    style={{ background: 'var(--accent)' }}
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
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-xs)' }}
        >
          {AGENTS.map((agent, i) => (
            <div key={agent} className="flex items-center gap-2">
              <span
                className="rounded-full animate-pulse-dot flex-shrink-0"
                style={{ width: 6, height: 6, background: AGENT_COLORS[i], animationDelay: `${i * 280}ms`, display: 'inline-block' }}
              />
              <span className="text-[11px] capitalize" style={{ color: 'var(--fg-3)' }}>
                {agent.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
        </div>
      </nav>

      {/* User footer */}
      <div
        className="px-3 py-3 border-t"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div
          className="flex items-center gap-2.5 p-2 rounded-lg"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
        >
          <div
            className="flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-semibold flex-shrink-0"
            style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}
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
