import { clsx } from 'clsx'

type Trend = 'up' | 'down' | 'neutral'

interface StatCardProps {
  label: string
  value: number | string
  sub?: string
  icon?: React.ReactNode
  trend?: Trend
  color?: string
  borderColor?: string
  className?: string
  delay?: number
}

export function StatCard({ label, value, sub, icon, color = '#0A0A0A', borderColor = '#E7E5E4', className, delay }: StatCardProps) {
  return (
    <div
      className={clsx('relative overflow-hidden rounded-xl border bg-white transition-all duration-200 hover:shadow-elevated p-5', className)}
      style={{
        borderColor,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)',
        animationDelay: delay ? `${delay}ms` : undefined,
      }}
    >
      <div className="space-y-3">
        {icon && (
          <div className="flex items-center justify-between">
            <div className="flex-shrink-0">{icon}</div>
            {sub && (
              <span className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
                {sub}
              </span>
            )}
          </div>
        )}
        <div>
          <p
            className="text-4xl font-extrabold tabular-nums leading-none"
            style={{ color, fontFamily: 'var(--font-mono), JetBrains Mono, monospace' }}
          >
            {value}
          </p>
          <p className="text-[10px] mt-2 font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--text-tertiary)' }}>
            {label}
          </p>
        </div>
      </div>
    </div>
  )
}
