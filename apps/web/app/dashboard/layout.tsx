import { Suspense } from 'react'
import { SidebarNav } from '@/components/SidebarNav'
import { DashboardTopbar } from '@/components/DashboardTopbar'
import { DemoAutoSeed } from '@/components/demo/DemoAutoSeed'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-canvas)' }}>
      <DemoAutoSeed />
      <Suspense fallback={<div style={{ width: 'var(--sidebar-w)' }} />}>
        <SidebarNav />
      </Suspense>

      {/* Main */}
      <main
        className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden border-l"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <DashboardTopbar />
        <div className="min-h-0 flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
