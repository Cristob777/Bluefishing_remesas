'use client'

import { motion } from 'framer-motion'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'

export function GmailErrorBanner({ lastErrorAt }: { lastErrorAt?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mx-8 mt-4 rounded-xl flex items-start gap-3 px-4 py-3"
      style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}
    >
      <AlertCircle size={18} style={{ color: '#DC2626' }} className="flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: '#991B1B' }}>
          Gmail desconectado
        </p>
        <p className="text-xs mt-0.5" style={{ color: '#B91C1C' }}>
          Los agentes no están procesando correos.
          {lastErrorAt && <> Último error: {new Date(lastErrorAt).toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}.</>}
          {' '}Reconecta para continuar.
        </p>
      </div>
      <Link
        href="/api/gmail-auth"
        className="text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap"
        style={{ background: '#DC2626', color: '#FFF' }}
      >
        Reconectar Gmail
      </Link>
    </motion.div>
  )
}
