# Dashboard UX Uplift — Reference

Copy-paste-ready patterns. Each section is independent.

## 1. Empty states with contextual CTA

The empty state must answer: *"what should I do right now?"*. Three contexts, three patterns:

### a) Setup pending (no data ever)
```tsx
import { motion } from 'framer-motion'

export function EmptyStateOnboard({
  icon, title, description, ctaLabel, ctaHref, secondaryLabel, secondaryHref,
}: {
  icon: React.ReactNode
  title: string
  description: string
  ctaLabel: string
  ctaHref: string
  secondaryLabel?: string
  secondaryHref?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center px-8 py-16 text-center"
    >
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
           style={{ background: '#F5F3FF' }}>
        {icon}
      </div>
      <h3 className="text-base font-semibold text-stone-900 mb-1.5">{title}</h3>
      <p className="text-sm text-stone-500 max-w-sm mb-6">{description}</p>
      <div className="flex gap-2">
        <a href={ctaHref} className="btn-primary">{ctaLabel}</a>
        {secondaryHref && (
          <a href={secondaryHref} className="btn-secondary">{secondaryLabel}</a>
        )}
      </div>
    </motion.div>
  )
}
```

### b) Filter returned no results
```tsx
<EmptyState
  icon={<Search size={20} />}
  title="No matches"
  description={`Nothing matches "${query}". Try clearing filters.`}
  cta={{ label: 'Clear filters', onClick: () => setFilter(null) }}
/>
```

### c) Async task in progress (not "loading" — "agents will pick this up")
```tsx
<EmptyState
  icon={<Bot size={20} className="animate-pulse" />}
  title="Agents are watching"
  description="The next email from your suppliers will appear here within minutes."
  meta="Last poll: 2m ago"
/>
```

## 2. Onboarding checklist (Linear-style)

Server component reads completion state from DB; rows animate in:

```tsx
const STEPS = [
  { id: 'gmail',    label: 'Connect Gmail',            done: !!gmailToken,    href: '/api/gmail-auth' },
  { id: 'supplier', label: 'Add your first supplier',  done: suppliersCount > 0, href: '/dashboard/suppliers/new' },
  { id: 'invoice',  label: 'Forward your first invoice', done: remesasCount > 0, hint: 'Forward an email to your inbox' },
  { id: 'team',     label: 'Invite Finance + Owner',   done: usersCount >= 2, href: '/settings/team' },
]

const completed = STEPS.filter(s => s.done).length
const pct       = Math.round((completed / STEPS.length) * 100)

return (
  <motion.div layout className="card p-5">
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-sm font-bold">Get started</h2>
        <p className="text-xs text-stone-500">{completed} of {STEPS.length} complete</p>
      </div>
      <div className="text-2xl font-bold mono">{pct}%</div>
    </div>

    <div className="h-1 rounded-full overflow-hidden bg-stone-100 mb-4">
      <motion.div className="h-full bg-indigo-600"
        initial={{ width: 0 }} animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }} />
    </div>

    <ul className="space-y-1">
      {STEPS.map((s, i) => (
        <motion.li key={s.id}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-3 py-2"
        >
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
            s.done ? 'bg-emerald-500 text-white' : 'bg-stone-100 text-stone-400 border border-stone-200'
          }`}>
            {s.done ? '✓' : i + 1}
          </span>
          <span className={`flex-1 text-sm ${s.done ? 'text-stone-400 line-through' : 'text-stone-900'}`}>
            {s.label}
          </span>
          {!s.done && s.href && (
            <a href={s.href} className="text-xs font-medium text-indigo-600 hover:underline">
              Start →
            </a>
          )}
          {!s.done && s.hint && (
            <span className="text-xs text-stone-400">{s.hint}</span>
          )}
        </motion.li>
      ))}
    </ul>
  </motion.div>
)
```

Auto-hide the checklist when `pct === 100` (use `AnimatePresence`).

## 3. Framer Motion micro-animation patterns

### Stagger list entrance
```tsx
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
}
const item = {
  hidden: { opacity: 0, y: 8 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
}

<motion.div variants={container} initial="hidden" animate="show">
  {items.map(i => (
    <motion.div key={i.id} variants={item}>{...}</motion.div>
  ))}
</motion.div>
```

### Count-up number
```tsx
import { useMotionValue, animate, useTransform } from 'framer-motion'

function CountUp({ to }: { to: number }) {
  const v = useMotionValue(0)
  const r = useTransform(v, n => Math.round(n).toLocaleString('es-CL'))
  useEffect(() => {
    const c = animate(v, to, { duration: 0.9, ease: [0.16, 1, 0.3, 1] })
    return c.stop
  }, [to])
  return <motion.span>{r}</motion.span>
}
```

### Skeleton → real data crossfade
```tsx
<AnimatePresence mode="wait">
  {loading ? (
    <motion.div key="skel" exit={{ opacity: 0 }}><Skeleton /></motion.div>
  ) : (
    <motion.div key="data" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
      <DataTable rows={rows} />
    </motion.div>
  )}
</AnimatePresence>
```

### Layout shift smoother (filtering a list)
Wrap each row in `<motion.div layout>` and the parent gets free smooth reorders.

### Hover lift on cards (subtle)
```tsx
<motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>...</motion.div>
```

## 4. Typography & spacing system

Drop into `app/layout.tsx`:
```tsx
import { GeistSans, GeistMono } from 'geist/font'
// className={`${GeistSans.variable} ${GeistMono.variable}`}
```

Tailwind `tailwind.config.ts` extension:
```ts
fontFamily: {
  sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
  mono: ['var(--font-geist-mono)', 'ui-monospace'],
},
fontSize: {
  // 7 sizes max — kill the inline 13px/15px chaos
  '2xs': ['11px', '14px'],
  'xs':  ['12px', '16px'],
  'sm':  ['13px', '18px'],
  'base':['14px', '20px'],
  'lg':  ['16px', '24px'],
  'xl':  ['20px', '28px'],
  '2xl': ['28px', '34px'],
},
```

Spacing scale: stick to Tailwind's 4-px grid. Never invent `gap-[7px]`.

## 5. Loading skeletons

Match the final shape, not generic boxes:

```tsx
// Stat card skeleton — matches the real card exactly
<div className="card p-5">
  <div className="flex items-start justify-between mb-4">
    <div className="w-10 h-10 rounded-xl bg-stone-200 animate-pulse" />
    <div className="w-16 h-3 rounded bg-stone-200 animate-pulse" />
  </div>
  <div className="w-20 h-9 rounded bg-stone-200 animate-pulse" />
  <div className="w-32 h-3 mt-2 rounded bg-stone-200 animate-pulse" />
</div>
```

Don't pulse the whole card — pulse the elements. Don't show a "loading…" spinner over real content; show the skeleton in its place.

## 6. Error states with recovery

```tsx
<div className="rounded-xl border border-red-200 bg-red-50 p-4">
  <div className="flex items-start gap-3">
    <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
    <div className="flex-1">
      <p className="text-sm font-semibold text-red-900">Gmail isn't connected</p>
      <p className="text-xs text-red-700 mt-0.5">
        Agents stopped processing email at 14:22. Reconnect to resume.
      </p>
    </div>
    <button onClick={reconnect} className="btn-sm-danger">Reconnect</button>
  </div>
</div>
```

Anti-pattern: showing `ERROR: ECONNREFUSED 127.0.0.1:5432` to the user. Always wrap in human copy + a button.

## 7. Sticky-header tables

```tsx
<div className="card overflow-hidden">
  <div className="overflow-auto max-h-[70vh]">
    <table className="w-full">
      <thead className="sticky top-0 z-10 bg-stone-50 border-b border-stone-200">
        <tr>
          <th className="th">Factura</th>
          ...
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <motion.tr key={r.id} layout
            className="border-b border-stone-100 hover:bg-stone-50 cursor-pointer transition-colors"
            onClick={() => open(r)}
          >...</motion.tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
```

If the dataset > 200 rows, virtualize with `@tanstack/react-virtual`.

## 8. Command bar (⌘K)

Use `cmdk` (the headless library that powers Linear/Vercel):

```bash
npm i cmdk
```

```tsx
'use client'
import { Command } from 'cmdk'
import { useEffect, useState } from 'react'

export function CommandBar({ routes, records }: { routes: Route[]; records: Record[] }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(v => !v)
      }
    }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [])

  return (
    <Command.Dialog open={open} onOpenChange={setOpen} label="Command menu">
      <Command.Input placeholder="Search remesas, agentes, stock..." autoFocus />
      <Command.List>
        <Command.Empty>No matches.</Command.Empty>

        <Command.Group heading="Páginas">
          {routes.map(r => (
            <Command.Item key={r.href} onSelect={() => location.href = r.href}>
              {r.icon} {r.label}
            </Command.Item>
          ))}
        </Command.Group>

        <Command.Group heading="Remesas recientes">
          {records.map(r => (
            <Command.Item key={r.id} value={`${r.numero_invoice} ${r.proveedor}`}>
              {r.numero_invoice} — {r.proveedor}
            </Command.Item>
          ))}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  )
}
```

Style with `cmdk` recipes from the docs (https://cmdk.paco.me).

## Dependencies cheat sheet

```bash
npm i framer-motion cmdk lucide-react
npm i geist            # only if migrating from Inter
npm i @tanstack/react-virtual  # only if tables > 200 rows
```

No need for shadcn/ui setup if the project already has its own card/button primitives — just borrow the patterns.
