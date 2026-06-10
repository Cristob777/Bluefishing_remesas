'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ComponentType } from 'react'
import { clsx } from 'clsx'
import {
  Bot,
  ChevronsUpDown,
  FileText,
  Inbox,
  LayoutDashboard,
  Package,
  Settings,
  Settings2,
  Ship,
  SunMoon,
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'

type NavItem = {
  href: string
  label: string
  Icon: ComponentType<{ size?: string | number; strokeWidth?: string | number; className?: string }>
  counter?: number | null
  dot?: boolean
  accent?: boolean
  tone?: 'review'
}

const MAIN_NAV: Array<Omit<NavItem, 'counter'>> = [
  { href: '/dashboard/overview',   label: 'Overview',   Icon: LayoutDashboard },
  { href: '/dashboard/remesas',    label: 'Shipments',  Icon: Ship },
  { href: '/dashboard/actions',    label: 'Actions',    Icon: Inbox, accent: true },
  { href: '/dashboard/stock',      label: 'Stock',      Icon: Package },
  { href: '/dashboard/agents',     label: 'Agents',     Icon: Bot, dot: true },
  { href: '/dashboard/documentos', label: 'Documents',  Icon: FileText, tone: 'review' },
]

const BOTTOM_NAV: Array<Omit<NavItem, 'counter'>> = [
  { href: '/dashboard/reglas',   label: 'Rules',    Icon: Settings2 },
  { href: '/dashboard/settings', label: 'Settings', Icon: Settings },
]

function isActivePath(pathname: string | null, href: string) {
  if (!pathname) return false
  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavButton({ item, active }: { item: NavItem; active: boolean }) {
  const { href, label, Icon, counter, dot, accent, tone } = item

  return (
    <Link
      href={href}
      className={clsx('bf-nav-item', active && 'bf-nav-item-active')}
    >
      <Icon size={15} strokeWidth={1.6} className="shrink-0" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {dot && (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: 'var(--c-green-500)', boxShadow: '0 0 0 3px var(--c-green-50)' }}
        />
      )}
      {typeof counter === 'number' && counter > 0 && (
        <span
          className="min-w-[18px] rounded-full px-[7px] py-px text-center text-[10px] font-semibold tnum"
          style={{
            background: accent ? 'var(--accent)' : tone === 'review' ? 'var(--c-amber-100)' : 'var(--bg-muted)',
            color: accent ? 'var(--fg-on-accent)' : tone === 'review' ? 'var(--c-amber-700)' : 'var(--fg-3)',
          }}
        >
          {counter > 99 ? '99+' : counter}
        </span>
      )}
    </Link>
  )
}

export function SidebarNav() {
  const pathname = usePathname()
  const [pendingCount, setPendingCount] = useState<number | null>(null)
  const [docsReviewCount, setDocsReviewCount] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/actions/pending')
      .then(r => r.json())
      .then(d => setPendingCount(d?.total ?? 0))
      .catch(() => setPendingCount(null))

    fetch('/api/documents?limit=50')
      .then(r => r.json())
      .then(d => {
        const docs = Array.isArray(d?.data) ? d.data : []
        setDocsReviewCount(docs.filter((doc: { confianza?: number | null }) => doc.confianza == null || doc.confianza < 0.82).length)
      })
      .catch(() => setDocsReviewCount(null))
  }, [])

  const initials = (process.env.NEXT_PUBLIC_OWNER_DISPLAY ?? 'MR').slice(0, 2).toUpperCase()

  const mainNav = MAIN_NAV.map(item => ({
    ...item,
    counter:
      item.href === '/dashboard/actions' ? pendingCount
      : item.href === '/dashboard/documentos' ? docsReviewCount
      : null,
  }))

  return (
    <aside
      className="flex h-screen flex-col"
      style={{
        width: 'var(--sidebar-w)',
        background: 'var(--bg-sidebar)',
        padding: '20px 14px 14px',
      }}
    >
      <Link href="/dashboard/overview" className="flex items-center gap-2 px-1 pb-[18px] no-underline">
        <Logo size={20} />
        <span className="text-base font-medium tracking-[-0.018em]" style={{ color: 'var(--fg-1)' }}>
          {process.env.NEXT_PUBLIC_COMPANY_DISPLAY ?? 'import ops'}
        </span>
      </Link>

      <button
        type="button"
        className="mb-[18px] flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left"
        style={{
          background: 'var(--bg-surface)',
          borderColor: 'var(--border-default)',
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        <div
          className="h-5 w-5 shrink-0 rounded-md"
          style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #5B6FE0 60%, #2563EB 100%)' }}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold" style={{ color: 'var(--fg-1)' }}>{process.env.NEXT_PUBLIC_COMPANY_DISPLAY ?? 'Import Ops'}</div>
          <div className="truncate text-[10px]" style={{ color: 'var(--fg-4)' }}>Import Operations Platform</div>
        </div>
        <ChevronsUpDown size={12} strokeWidth={1.6} style={{ color: 'var(--fg-4)' }} />
      </button>

      <nav className="flex flex-1 flex-col gap-px">
        {mainNav.map(item => (
          <NavButton key={item.href} item={item} active={isActivePath(pathname, item.href)} />
        ))}
      </nav>

      <div className="flex flex-col gap-px pt-2">
        {BOTTOM_NAV.map(item => (
          <NavButton key={item.href} item={item} active={isActivePath(pathname, item.href)} />
        ))}
      </div>

      <div
        className="mt-3 flex items-center gap-2 border-t pt-3"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <span className="avatar h-[26px] w-[26px] text-[11px]">{initials}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold" style={{ color: 'var(--fg-1)' }}>
            {process.env.NEXT_PUBLIC_OWNER_DISPLAY ?? 'Alex Rivera'}
          </div>
          <div className="text-[10px]" style={{ color: 'var(--fg-4)' }}>Operations</div>
        </div>
        <button
          type="button"
          className="inline-flex rounded p-1"
          style={{ color: 'var(--fg-3)' }}
          aria-label="Tema"
          onClick={() => {
            const el = document.documentElement
            el.dataset.theme = el.dataset.theme === 'dark' ? '' : 'dark'
          }}
        >
          <SunMoon size={14} strokeWidth={1.6} />
        </button>
      </div>
    </aside>
  )
}
