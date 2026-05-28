import { Suspense } from 'react'
import { SidebarNav } from '@/components/SidebarNav'
import { DashboardTopbar } from '@/components/DashboardTopbar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-canvas)' }}>

      {/* Sidebar */}
      <aside
        className="relative z-10 flex w-[232px] flex-col flex-shrink-0 border-r"
        style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-subtle)' }}
      >
        <Suspense fallback={<div className="flex-1" />}>
          <SidebarNav />
        </Suspense>
      </aside>

      {/* Main */}
      <main className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardTopbar />
        <div className="min-h-0 flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
