'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'

const NAV = [
  { href: '/dashboard/overview', label: 'Overview',  icon: '★' },
  { href: '/dashboard/remesas',  label: 'Remesas',   icon: '★' },
  { href: '/dashboard/stock',    label: 'Stock',     icon: '★' },
  { href: '/dashboard/agents',   label: 'Agentes',   icon: '★' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col bg-navy-950 text-white">
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 py-5 border-b border-navy-800">
          <span className="text-2xl">🎣</span>
          <div>
            <p className="font-bold text-sm leading-tight">BLUEFISHING</p>
            <p className="text-xs text-blue-300 leading-tight">Agents</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                pathname === href
                  ? 'bg-navy-700 text-white'
                  : 'text-blue-200 hover:bg-navy-800 hover:text-white'
              )}
            >
              <span className="text-xs opacity-70">{icon}</span>
              {label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-navy-800">
          <p className="text-xs text-blue-400">MI TIENDA SPA</p>
          <p className="text-xs text-blue-500">RUT 76.999.020-8</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-gray-50">
        {children}
      </main>
    </div>
  )
}
