import Link from 'next/link'

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-8"
      style={{ background: 'var(--bg-subtle)' }}
    >
      <div className="text-center max-w-md">
        <div
          className="text-[80px] font-bold leading-none mb-4 tnum"
          style={{ color: 'var(--border-strong)' }}
        >
          404
        </div>
        <h1 className="t-h2 mb-2">Página no encontrada</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--fg-3)' }}>
          La página que buscas no existe o fue movida.
        </p>
        <Link href="/dashboard/overview" className="btn btn--primary">
          Ir al dashboard
        </Link>
      </div>
    </div>
  )
}
