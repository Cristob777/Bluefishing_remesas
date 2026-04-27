'use client'

import { clsx } from 'clsx'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: React.ReactNode
  iconRight?: React.ReactNode
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  className?: string
  children: React.ReactNode
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-sm gap-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  disabled,
  type = 'button',
  className,
  children,
  onClick,
}: ButtonProps) {
  const isDisabled = disabled || loading

  const base = clsx(
    'inline-flex items-center font-semibold rounded-lg transition-all duration-150 active:scale-[0.98] focus:outline-none select-none',
    SIZE_CLASSES[size],
    isDisabled && 'opacity-50 cursor-not-allowed',
    !isDisabled && 'cursor-pointer',
  )

  if (variant === 'primary') {
    return (
      <button type={type} onClick={onClick} disabled={isDisabled}
        className={clsx(base, 'text-white', className)}
        style={{ background: isDisabled ? '#A5B4FC' : 'var(--accent)' }}
        onMouseEnter={e => { if (!isDisabled) (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-hover)' }}
        onMouseLeave={e => { if (!isDisabled) (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)' }}
      >
        {loading ? <Spinner /> : icon}
        {children}
        {!loading && iconRight}
      </button>
    )
  }

  if (variant === 'danger') {
    return (
      <button type={type} onClick={onClick} disabled={isDisabled}
        className={clsx(base, 'text-white', className)}
        style={{ background: '#DC2626' }}
      >
        {loading ? <Spinner /> : icon}
        {children}
        {!loading && iconRight}
      </button>
    )
  }

  if (variant === 'secondary') {
    return (
      <button type={type} onClick={onClick} disabled={isDisabled}
        className={clsx(base, className)}
        style={{ color: 'var(--text-secondary)', background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {loading ? <Spinner color="var(--text-secondary)" /> : icon}
        {children}
        {!loading && iconRight}
      </button>
    )
  }

  return (
    <button type={type} onClick={onClick} disabled={isDisabled}
      className={clsx(base, className)}
      style={{ color: 'var(--text-tertiary)' }}
    >
      {loading ? <Spinner color="var(--text-tertiary)" /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  )
}

function Spinner({ color = '#FFFFFF' }: { color?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="animate-spin-fast flex-shrink-0">
      <circle cx="7" cy="7" r="5.5" stroke={color} strokeOpacity="0.25" strokeWidth="2" />
      <path d="M7 1.5A5.5 5.5 0 0 1 12.5 7" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
