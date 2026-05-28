'use client'

import { useEffect, useState, useCallback, useRef, type ComponentType } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Search, ArrowRight, LayoutDashboard, ArrowLeftRight, Package, Zap, Bot,
  Mail, FileText, GitBranch, Settings,
} from 'lucide-react'

interface NavItem {
  label: string
  href:  string
  icon:  ComponentType<{ size?: string | number }>
  group: 'navigation' | 'action'
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Resumen',          href: '/dashboard/overview',  icon: LayoutDashboard, group: 'navigation' },
  { label: 'Remesas',          href: '/dashboard/remesas',   icon: ArrowLeftRight,  group: 'navigation' },
  { label: 'Stock',            href: '/dashboard/stock',     icon: Package,         group: 'navigation' },
  { label: 'Acciones',         href: '/dashboard/actions',   icon: Zap,             group: 'navigation' },
  { label: 'Agentes',          href: '/dashboard/agents',    icon: Bot,             group: 'navigation' },
  { label: 'Documentos',       href: '/dashboard/documentos', icon: FileText,        group: 'navigation' },
  { label: 'Reglas',           href: '/dashboard/reglas',    icon: GitBranch,       group: 'navigation' },
  { label: 'Configuración',    href: '/dashboard/settings',  icon: Settings,        group: 'navigation' },
  { label: 'Conectar Gmail',   href: '/api/gmail-auth',      icon: Mail,            group: 'action' },
  { label: 'Configurar filtros Gmail', href: '/api/setup/gmail-filters', icon: FileText, group: 'action' },
]

interface RemesaHit {
  id:             string
  numero_invoice: string
  proveedor?:     string | null
  estado?:        string | null
}

interface KBarSearchProps {
  open: boolean
  onClose: () => void
}

type Result =
  | { kind: 'nav';    item: NavItem }
  | { kind: 'remesa'; item: RemesaHit }

export function KBarSearch({ open, onClose }: KBarSearchProps) {
  const router         = useRouter()
  const inputRef       = useRef<HTMLInputElement>(null)
  const [query, setQuery]           = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [remesas, setRemesas]       = useState<RemesaHit[]>([])

  // Fetch recent remesas once when opened
  useEffect(() => {
    if (!open || remesas.length > 0) return
    fetch('/api/remesas?limit=20')
      .then(r => r.json())
      .then(d => {
        const hits: RemesaHit[] = (d.remesas ?? []).map((r: { id: string; numero_invoice: string; proveedor?: { nombre?: string }; estado?: string }) => ({
          id: r.id,
          numero_invoice: r.numero_invoice,
          proveedor: r.proveedor?.nombre ?? null,
          estado: r.estado,
        }))
        setRemesas(hits)
      })
      .catch(() => {})
  }, [open, remesas.length])

  // Build the unified result list (filtered by query)
  const q = query.trim().toLowerCase()
  const navMatches: Result[] = NAV_ITEMS
    .filter(i => q === '' || i.label.toLowerCase().includes(q))
    .map(item => ({ kind: 'nav' as const, item }))
  const remesaMatches: Result[] = remesas
    .filter(r => q !== '' && (
      r.numero_invoice.toLowerCase().includes(q) ||
      (r.proveedor ?? '').toLowerCase().includes(q)
    ))
    .slice(0, 6)
    .map(item => ({ kind: 'remesa' as const, item }))

  const results: Result[] = [...navMatches, ...remesaMatches]

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => { setSelectedIdx(0) }, [q])

  const go = useCallback((r: Result) => {
    if (r.kind === 'nav') router.push(r.item.href)
    else router.push(`/dashboard/remesas?focus=${r.item.id}`)
    onClose()
  }, [router, onClose])

  useEffect(() => {
    if (!open) return
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
      if (e.key === 'Enter' && results[selectedIdx]) go(results[selectedIdx])
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, results, selectedIdx, go, onClose])

  // Group results for rendering
  const navResults    = results.filter(r => r.kind === 'nav'    && r.item.group === 'navigation')
  const actionResults = results.filter(r => r.kind === 'nav'    && r.item.group === 'action')
  const remesaResults = results.filter(r => r.kind === 'remesa')

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-lg mx-4 rounded-2xl overflow-hidden"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-xl)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3.5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <Search size={16} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar remesa, factura, DIN..."
                className="flex-1 text-sm bg-transparent focus:outline-none"
                style={{ color: 'var(--fg-1)' }}
              />
              <kbd className="text-[10px] px-1.5 py-0.5 rounded">ESC</kbd>
            </div>

            <div className="py-2 max-h-[50vh] overflow-y-auto">
              {results.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm" style={{ color: 'var(--fg-4)' }}>Sin resultados</p>
              ) : (
                <>
                  {navResults.length > 0 && (
                    <ResultGroup label="Navegación" items={navResults} startIdx={0} selectedIdx={selectedIdx} setSelectedIdx={setSelectedIdx} onGo={go} />
                  )}
                  {actionResults.length > 0 && (
                    <ResultGroup label="Acciones" items={actionResults} startIdx={navResults.length} selectedIdx={selectedIdx} setSelectedIdx={setSelectedIdx} onGo={go} />
                  )}
                  {remesaResults.length > 0 && (
                    <ResultGroup label="Remesas" items={remesaResults} startIdx={navResults.length + actionResults.length} selectedIdx={selectedIdx} setSelectedIdx={setSelectedIdx} onGo={go} />
                  )}
                </>
              )}
            </div>

            <div className="px-4 py-2.5 border-t flex items-center gap-4" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-subtle)' }}>
              <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--fg-4)' }}>
                <kbd className="px-1 py-0.5 rounded text-[9px]">↑↓</kbd> navegar
              </span>
              <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--fg-4)' }}>
                <kbd className="px-1 py-0.5 rounded text-[9px]">↵</kbd> ir
              </span>
              <span className="ml-auto text-[10px]" style={{ color: 'var(--fg-4)' }}>
                <kbd className="px-1 py-0.5 rounded text-[9px]">⌘K</kbd>
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ResultGroup({
  label, items, startIdx, selectedIdx, setSelectedIdx, onGo,
}: {
  label:        string
  items:        Result[]
  startIdx:     number
  selectedIdx:  number
  setSelectedIdx: (n: number) => void
  onGo:         (r: Result) => void
}) {
  return (
    <>
      <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--fg-4)' }}>
        {label}
      </p>
      {items.map((r, i) => {
        const absIdx  = startIdx + i
        const active  = absIdx === selectedIdx
        const isNav   = r.kind === 'nav'
        const Icon    = isNav ? r.item.icon : FileText
        const title   = isNav ? r.item.label : r.item.numero_invoice
        const subtitle = isNav ? null : (r.item.proveedor ?? '—')
        return (
          <button
            key={isNav ? r.item.href : r.item.id}
            onClick={() => onGo(r)}
            onMouseEnter={() => setSelectedIdx(absIdx)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-100"
            style={{
              background: active ? 'var(--bg-active)' : 'transparent',
              color: active ? 'var(--accent)' : 'var(--fg-2)',
            }}
          >
            <Icon size={15} />
            <span className="flex-1 text-left">
              <span className="font-medium">{title}</span>
              {subtitle && (
                <span className="ml-2 text-[11px]" style={{ color: 'var(--fg-4)' }}>· {subtitle}</span>
              )}
            </span>
            {active && <ArrowRight size={14} />}
          </button>
        )
      })}
    </>
  )
}

export function useKBar() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return { open, setOpen }
}
