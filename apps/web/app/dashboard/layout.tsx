import { Suspense } from 'react'
import { SidebarNav } from '@/components/SidebarNav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#FAFAF9' }}>

      {/* Sidebar */}
      <aside
        className="relative z-10 flex w-[240px] flex-col flex-shrink-0 border-r"
        style={{ background: '#FFFFFF', borderColor: '#E7E5E4' }}
      >
        <Suspense fallback={<div className="flex-1" />}>
          <SidebarNav />
        </Suspense>
      </aside>

      {/* Main */}
      <main className="relative z-10 flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
