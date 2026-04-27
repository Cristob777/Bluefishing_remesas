import { clsx } from 'clsx'

type Variant = 'urgent' | 'success' | 'pending' | 'info' | 'neutral' | 'warning' | 'purple'
type Size    = 'sm' | 'md'

interface BadgeProps {
  variant?: Variant
  size?: Size
  dot?: boolean
  children: React.ReactNode
  className?: string
}

const STYLES: Record<Variant, string> = {
  urgent:  'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]',
  success: 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]',
  pending: 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]',
  info:    'bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE]',
  neutral: 'bg-[#F5F5F4] text-[#525252] border border-[#E7E5E4]',
  warning: 'bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]',
  purple:  'bg-[#F5F3FF] text-[#7C3AED] border border-[#DDD6FE]',
}

const DOT_COLORS: Record<Variant, string> = {
  urgent:  '#DC2626',
  success: '#059669',
  pending: '#D97706',
  info:    '#4F46E5',
  neutral: '#A3A3A3',
  warning: '#C2410C',
  purple:  '#7C3AED',
}

export function Badge({ variant = 'neutral', size = 'sm', dot, children, className }: BadgeProps) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 font-medium rounded-md',
      size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
      STYLES[variant],
      className,
    )}>
      {dot && (
        <span
          className="flex-shrink-0 rounded-full"
          style={{
            width: 5,
            height: 5,
            background: DOT_COLORS[variant],
          }}
        />
      )}
      {children}
    </span>
  )
}
