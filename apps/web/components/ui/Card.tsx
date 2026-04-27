import { clsx } from 'clsx'

type Variant = 'default' | 'glass' | 'elevated'
type Padding  = 'sm' | 'md' | 'lg' | 'hero' | 'none'

interface CardProps {
  variant?: Variant
  padding?: Padding
  className?: string
  children: React.ReactNode
  style?: React.CSSProperties
  onClick?: () => void
}

const PADDING: Record<Padding, string> = {
  none: '',
  sm:   'p-4',
  md:   'p-5',
  lg:   'p-6',
  hero: 'p-7',
}

export function Card({ variant = 'default', padding = 'md', className, children, style, onClick }: CardProps) {
  if (variant === 'glass') {
    return (
      <div
        className={clsx('card-glass', PADDING[padding], onClick && 'cursor-pointer', className)}
        style={style}
        onClick={onClick}
      >
        {children}
      </div>
    )
  }

  if (variant === 'elevated') {
    return (
      <div
        className={clsx('card-elevated', PADDING[padding], onClick && 'cursor-pointer', className)}
        style={style}
        onClick={onClick}
      >
        {children}
      </div>
    )
  }

  return (
    <div
      className={clsx('card', PADDING[padding], onClick && 'cursor-pointer', className)}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
