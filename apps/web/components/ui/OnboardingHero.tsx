'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

interface Step {
  id:    string
  label: string
  done:  boolean
  href?: string
  hint?: string
}

export function OnboardingHero({ steps, companyName }: { steps: Step[]; companyName?: string }) {
  const completed = steps.filter(s => s.done).length
  const pct       = Math.round((completed / steps.length) * 100)

  return (
    <div className="px-8 pt-10 pb-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-2" style={{ color: '#A3A3A3' }}>
          Bienvenido
        </p>
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#0A0A0A' }}>
          Pongamos en marcha {companyName ?? 'tu operación'}
        </h1>
        <p className="text-sm mt-2 max-w-xl" style={{ color: '#525252' }}>
          Sigue estos pasos para que los agentes empiecen a procesar tus correos. Tarda menos de 5 minutos.
        </p>
      </motion.div>

      <motion.div
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="card mt-6 p-6 max-w-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#A3A3A3' }}>
              Configuración inicial
            </p>
            <p className="text-sm mt-1" style={{ color: '#525252' }}>
              {completed} de {steps.length} completados
            </p>
          </div>
          <div className="text-3xl font-bold font-mono" style={{ color: pct === 100 ? '#059669' : '#4F46E5' }}>
            {pct}%
          </div>
        </div>

        <div className="h-1 rounded-full overflow-hidden mb-5" style={{ background: '#F5F5F4' }}>
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            style={{ background: pct === 100 ? '#059669' : '#4F46E5' }}
          />
        </div>

        <ul className="space-y-1">
          {steps.map((s, i) => (
            <motion.li
              key={s.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.05, duration: 0.3 }}
              className="flex items-center gap-3 py-2.5"
            >
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                style={
                  s.done
                    ? { background: '#059669', color: '#FFF' }
                    : { background: '#F5F5F4', color: '#A3A3A3', border: '1px solid #E7E5E4' }
                }
              >
                {s.done ? '✓' : i + 1}
              </span>
              <span
                className="flex-1 text-sm"
                style={{
                  color: s.done ? '#A3A3A3' : '#0A0A0A',
                  textDecoration: s.done ? 'line-through' : 'none',
                }}
              >
                {s.label}
              </span>
              {!s.done && s.href && (
                <Link
                  href={s.href}
                  className="text-xs font-semibold whitespace-nowrap hover:underline"
                  style={{ color: '#4F46E5' }}
                >
                  Comenzar →
                </Link>
              )}
              {!s.done && !s.href && s.hint && (
                <span className="text-xs" style={{ color: '#A3A3A3' }}>{s.hint}</span>
              )}
            </motion.li>
          ))}
        </ul>
      </motion.div>
    </div>
  )
}
