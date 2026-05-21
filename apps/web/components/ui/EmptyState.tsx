'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

interface CtaButton {
  label: string
  href?:    string
  onClick?: () => void
}

interface EmptyStateProps {
  icon?:        React.ReactNode
  title:        string
  description?: string
  action?:      CtaButton
  secondary?:   CtaButton
  meta?:        string
}

function CtaLink({ cta, variant }: { cta: CtaButton; variant: 'primary' | 'secondary' }) {
  const className = variant === 'primary'
    ? 'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 active:scale-[0.98]'
    : 'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 active:scale-[0.98] border'

  const style = variant === 'primary'
    ? { background: '#4F46E5', color: '#FFF' }
    : { background: '#FFF',    color: '#525252', borderColor: '#E7E5E4' }

  if (cta.href) {
    return <Link href={cta.href} className={className} style={style}>{cta.label}</Link>
  }
  return (
    <button onClick={cta.onClick} className={className} style={style}>
      {cta.label}
    </button>
  )
}

export function EmptyState({ icon, title, description, action, secondary, meta }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      {icon && (
        <div
          className="flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
          style={{ background: '#F5F5F4', border: '1px solid #E7E5E4' }}
        >
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold" style={{ color: '#0A0A0A' }}>{title}</p>
      {description && (
        <p className="text-sm mt-1.5 max-w-sm leading-relaxed" style={{ color: '#A3A3A3' }}>
          {description}
        </p>
      )}
      {(action || secondary) && (
        <div className="flex items-center gap-2 mt-5">
          {action    && <CtaLink cta={action}    variant="primary" />}
          {secondary && <CtaLink cta={secondary} variant="secondary" />}
        </div>
      )}
      {meta && (
        <p className="text-[11px] mt-3 font-mono" style={{ color: '#A3A3A3' }}>{meta}</p>
      )}
    </motion.div>
  )
}
