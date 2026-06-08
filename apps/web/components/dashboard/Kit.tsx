'use client'

import { useState, useEffect, useRef, type ReactNode } from 'react'
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

// Count-up animation hook — easeOutCubic, 800ms
function useCountUp(target: number, duration = 800) {
  const [val, setVal] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (typeof target !== 'number' || isNaN(target)) return
    const startTime = performance.now()
    const startVal = 0

    function tick(now: number) {
      const elapsed = now - startTime
      const t = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - t, 3) // easeOutCubic
      setVal(startVal + (target - startVal) * eased)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration])

  return val
}

export function KpiCard({
  label,
  value,
  delta,
  tone = 'neutral',
  animate = true,
}: {
  label: string
  value: ReactNode
  delta?: string
  tone?: 'neutral' | 'warning' | 'danger' | 'success'
  animate?: boolean
}) {
  const toneColor = {
    neutral: 'var(--fg-3)',
    warning: 'var(--warning)',
    danger: 'var(--danger)',
    success: 'var(--success)',
  }[tone]

  // Try to extract number from value for count-up
  const rawStr = String(value ?? '')
  const numeric = parseFloat(rawStr.replace(/[^0-9.-]/g, ''))
  const prefix = rawStr.match(/^[^0-9.-]+/)?.[0] ?? ''
  const suffix = rawStr.match(/[^0-9.,]+$/)?.[0] ?? ''
  const hasNumeric = !isNaN(numeric)

  const animatedNum = useCountUp(animate && hasNumeric ? numeric : 0)
  const displayValue =
    animate && hasNumeric
      ? `${prefix}${Math.round(animatedNum).toLocaleString('en-US')}${suffix}`
      : value

  return (
    <div
      className="anim-slide-up flex flex-col gap-1"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--r-lg)',
        padding: '16px 18px',
        boxShadow: 'var(--shadow-xs)',
        transition: 'border-color 140ms var(--ease-out), box-shadow 140ms var(--ease-out)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-strong)'
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-default)'
        e.currentTarget.style.boxShadow = 'var(--shadow-xs)'
      }}
    >
      <div className="t-micro">{label}</div>
      <div className="tnum" style={{ fontSize: 28, lineHeight: 1.15, fontWeight: 600, color: 'var(--fg-1)' }}>
        {displayValue}
      </div>
      {delta && (
        <div style={{ fontSize: 12, color: toneColor }}>{delta}</div>
      )}
    </div>
  )
}

// KpiCard alias for backwards compat
export { KpiCard as KPI }

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
    <span
      className="agent-strip"
      style={compact ? { padding: '4px 8px', fontSize: 11 } : undefined}
    >
      <span className="sparkle" style={{ display: 'inline-flex' }}>
        <Sparkles size={12} strokeWidth={1.75} />
      </span>
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

export function Tabs({
  items,
  active,
  onChange,
}: {
  items: Array<{ key: string; label: string; count?: number }>
  active: string
  onChange: (key: string) => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        borderBottom: '1px solid var(--border-default)',
        marginBottom: 18,
      }}
    >
      {items.map((it) => {
        const isActive = it.key === active
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onChange(it.key)}
            style={{
              background: 'transparent',
              border: 0,
              padding: '10px 14px',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              fontWeight: 500,
              color: isActive ? 'var(--fg-1)' : 'var(--fg-3)',
              borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              transition: 'color 120ms var(--ease-out), border-color 120ms var(--ease-out)',
            }}
          >
            {it.label}
            {typeof it.count === 'number' && (
              <span
                style={{
                  background: isActive ? 'var(--accent-bg)' : 'var(--bg-subtle)',
                  color: isActive ? 'var(--accent-text)' : 'var(--fg-3)',
                  fontSize: 10,
                  fontWeight: 500,
                  padding: '1px 7px',
                  borderRadius: 999,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {it.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
