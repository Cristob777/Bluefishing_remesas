import type { ReactNode } from 'react'
import { Sparkles } from 'lucide-react'

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="t-h1 m-0 mb-1 truncate">{title}</h1>
        {subtitle && <p className="text-[13px]" style={{ color: 'var(--fg-3)' }}>{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Section({
  title,
  action,
  children,
  dense = false,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
  dense?: boolean
}) {
  return (
    <section style={{ marginBottom: dense ? 16 : 32 }}>
      <header className="mb-3.5 flex items-center justify-between">
        <h2 className="t-title m-0">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  )
}

export function KpiCard({
  label,
  value,
  delta,
  tone = 'neutral',
}: {
  label: string
  value: ReactNode
  delta?: string
  tone?: 'neutral' | 'warning' | 'danger' | 'success'
}) {
  const toneColor = {
    neutral: 'var(--fg-3)',
    warning: 'var(--warning)',
    danger: 'var(--danger)',
    success: 'var(--success)',
  }[tone]

  return (
    <div className="card flex flex-col gap-1 px-[18px] py-4">
      <div className="t-micro">{label}</div>
      <div className="tnum text-[28px] font-semibold leading-tight" style={{ color: 'var(--fg-1)' }}>
        {value}
      </div>
      {delta && <div className="text-xs" style={{ color: toneColor }}>{delta}</div>}
    </div>
  )
}

export function StatusPill({
  variant = 'idle',
  children,
}: {
  variant?: 'active' | 'pending' | 'review' | 'success' | 'error' | 'info' | 'idle'
  children: ReactNode
}) {
  return (
    <span className={`pill-status pill-status--${variant}`}>
      <span className="dot" />
      {children}
    </span>
  )
}

export function FilterChip({
  active,
  count,
  children,
  onClick,
}: {
  active: boolean
  count?: number
  children: ReactNode
  onClick?: () => void
}) {
  return (
    <button type="button" onClick={onClick} className={`filter-chip ${active ? 'filter-chip--active' : ''}`}>
      {children}
      {typeof count === 'number' && <span className="filter-chip__count">{count}</span>}
    </button>
  )
}

export function AgentStrip({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return (
    <span className="agent-strip" style={compact ? { padding: '4px 8px', fontSize: 11 } : undefined}>
      <Sparkles size={12} strokeWidth={1.75} />
      <span>{children}</span>
    </span>
  )
}

export function Confidence({ value }: { value: number }) {
  const pct = Math.round((value <= 1 ? value : value / 100) * 100)
  const variant = pct >= 90 ? 'green' : pct >= 75 ? 'amber' : 'red'

  return (
    <span className="confidence">
      <span className="confidence__bar">
        <span className={`confidence__fill confidence__fill--${variant}`} style={{ width: `${pct}%` }} />
      </span>
      <span>{pct}%</span>
    </span>
  )
}
