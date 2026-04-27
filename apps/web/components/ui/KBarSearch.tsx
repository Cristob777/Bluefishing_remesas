'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ArrowRight, LayoutDashboard, ArrowLeftRight, Package, Zap, Bot } from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Overview',   href: '/dashboard/overview',  icon: LayoutDashboard },
  { label: 'Remesas',    href: '/dashboard/remesas',   icon: ArrowLeftRight },
  { label: 'Stock',      href: '/dashboard/stock',     icon: Package },
  { label: 'Acciones',   href: '/dashboard/actions',   icon: Zap },
  { label: 'Agentes',    href: '/dashboard/agents',    icon: Bot },
]

interface KBarSearchProps {
  open: boolean
  onClose: () => void
}

export function KBarSearch({ open, onClose }: KBarSearchProps) {
  const router       = useRouter()
  const inputRef     = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)

  const filtered = NAV_ITEMS.filter(i =>
    query === '' || i.label.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const navigate = useCallback((href: string) => {
    router.push(href)
    onClose()
  }, [router, onClose])

  useEffect(() => {
    if (!open) return
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, filtered.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
      if (e.key === 'Enter' && filtered[selectedIdx]) navigate(filtered[selectedIdx].href)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, filtered, selectedIdx, navigate, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-4 rounded-2xl overflow-hidden animate-fade-up"
        style={{
          background: '#FFFFFF',
          border: '1px solid #E7E5E4',
          boxShadow: '0 24px 48px rgba(0,0,0,0.15)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b" style={{ borderColor: '#E7E5E4' }}>
          <Search size={16} style={{ color: '#A3A3A3', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIdx(0) }}
            placeholder="Buscar página o acción..."
            className="flex-1 text-sm bg-transparent focus:outline-none"
            style={{ color: '#0A0A0A' }}
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#F5F5F4', color: '#A3A3A3', border: '1px solid #E7E5E4' }}>ESC</kbd>
        </div>

        {/* Results */}
        <div className="py-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm" style={{ color: '#A3A3A3' }}>Sin resultados</p>
          ) : (
            <>
              <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#A3A3A3' }}>Navegación</p>
              {filtered.map((item, idx) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-100"
                    style={{
                      background: idx === selectedIdx ? '#EEF2FF' : 'transparent',
                      color: idx === selectedIdx ? '#4F46E5' : '#525252',
                    }}
                  >
                    <Icon size={15} />
                    <span className="flex-1 text-left font-medium">{item.label}</span>
                    {idx === selectedIdx && <ArrowRight size={14} />}
                  </button>
                )
              })}
            </>
          )}
        </div>

        <div className="px-4 py-2.5 border-t flex items-center gap-4" style={{ borderColor: '#E7E5E4', background: '#FAFAF9' }}>
          <span className="text-[10px] flex items-center gap-1" style={{ color: '#A3A3A3' }}>
            <kbd className="px-1 py-0.5 rounded text-[9px]" style={{ background: '#F5F5F4', border: '1px solid #E7E5E4' }}>↑↓</kbd> navegar
          </span>
          <span className="text-[10px] flex items-center gap-1" style={{ color: '#A3A3A3' }}>
            <kbd className="px-1 py-0.5 rounded text-[9px]" style={{ background: '#F5F5F4', border: '1px solid #E7E5E4' }}>↵</kbd> ir
          </span>
        </div>
      </div>
    </div>
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
