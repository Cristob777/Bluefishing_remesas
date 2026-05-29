export default function DashboardLoading() {
  return (
    <div className="dashboard-page">
      {/* Header skeleton */}
      <div className="mb-6 flex items-end justify-between">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-48 rounded-lg animate-pulse" style={{ background: 'var(--bg-muted)' }} />
          <div className="h-4 w-72 rounded animate-pulse" style={{ background: 'var(--bg-muted)' }} />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-24 rounded-lg animate-pulse" style={{ background: 'var(--bg-muted)' }} />
          <div className="h-8 w-24 rounded-lg animate-pulse" style={{ background: 'var(--bg-muted)' }} />
        </div>
      </div>

      {/* KPI cards skeleton */}
      <div className="mb-7 grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border p-[18px] flex flex-col gap-2"
            style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}
          >
            <div className="h-3 w-24 rounded animate-pulse" style={{ background: 'var(--bg-muted)' }} />
            <div className="h-8 w-16 rounded animate-pulse" style={{ background: 'var(--bg-muted)' }} />
            <div className="h-3 w-20 rounded animate-pulse" style={{ background: 'var(--bg-muted)' }} />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}
      >
        <div className="p-4 border-b flex justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="h-5 w-36 rounded animate-pulse" style={{ background: 'var(--bg-muted)' }} />
          <div className="h-5 w-20 rounded animate-pulse" style={{ background: 'var(--bg-muted)' }} />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3 border-b"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="h-4 w-28 rounded animate-pulse" style={{ background: 'var(--bg-muted)' }} />
            <div className="h-4 w-32 rounded animate-pulse" style={{ background: 'var(--bg-muted)' }} />
            <div className="h-5 w-20 rounded-full animate-pulse" style={{ background: 'var(--bg-muted)' }} />
            <div className="ml-auto h-4 w-16 rounded animate-pulse" style={{ background: 'var(--bg-muted)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
