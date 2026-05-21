# Dashboard UX Uplift — Examples

Real before/after applied to a Bluefishing-style operations dashboard.

## Example 1: Overview hero — DB is empty

### Before (the symptom)

```
PANEL
Operations
Thursday, 21 May 2026

[0] Active shipments   in progress
[0] Pending payments   orders to issue
[0] Urgent provisions  due in ≤ 3 days
[0] Stock discrepancies unresolved SKUs

USD Exposure: $0  USD   in active shipments
JPY Exposure: ¥0  JPY   in active shipments

Active alerts: (empty)
Agent activity: GMAIL API ERROR · GMAIL API ERROR · GMAIL API ERROR
```

Problems:
- Four `0`s scream "broken" instead of "empty"
- No CTA to fix the upstream cause (Gmail not connected)
- Agent log shows red errors with zero context

### After (one screen, three states detected, three responses)

Pseudo-code for `overview/page.tsx`:

```tsx
const isFirstRun = remesas === 0 && pagos === 0 && stock === 0
const gmailBroken = !!recentGmailErrors.length

if (isFirstRun) {
  return <OnboardingHero onboarding={STEPS} />     // checklist from REFERENCE.md §2
}

return (
  <>
    {gmailBroken && <GmailReconnectBanner />}      // error pattern from §6
    <Hero today={today} agentsActive={4} />
    <StatsGrid stats={stats} />                    // each card uses CountUp from §3
    <FxRow usd={totalUSD} jpy={totalJPY} hideIfZero />
    <AlertsAndActivity alerts={alertas} logs={agentLogs} />
  </>
)
```

Key fixes:
1. **First-run detection** swaps stats for the onboarding checklist (impact: dashboard makes sense on day 1)
2. **Gmail error banner** at top with a "Reconnect" button — not red noise inside the log
3. **`hideIfZero` prop** on FxRow — if nothing in foreign currency, don't show the section at all
4. **CountUp** in StatsGrid — numbers animate from 0 to value on load (delight + reinforces "I just calculated this")

## Example 2: Remesas table — empty filter result

### Before
```
[empty card with text: "No shipments in this category"]
```

### After
```tsx
{rows.length === 0 ? (
  filter !== 'all' ? (
    <EmptyState
      icon={<Filter size={20} />}
      title="Sin remesas en esta categoría"
      description={`No hay remesas en "${filterLabels[filter]}".`}
      cta={{ label: 'Ver todas', onClick: () => setFilter('all') }}
    />
  ) : (
    <EmptyState
      icon={<Inbox size={20} />}
      title="Aún no llegan remesas"
      description="Las remesas aparecen automáticamente cuando los agentes procesan correos de proveedores."
      cta={{ label: 'Conectar Gmail', href: '/api/gmail-auth' }}
      secondary={{ label: 'Ver setup', href: '/dashboard/setup' }}
    />
  )
) : (
  <RemesasTable rows={rows} />
)}
```

## Example 3: Stats card — skeleton matching the final shape

### Before (generic spinner)
```tsx
{loading ? <Spinner /> : <StatCard {...} />}
```

### After (matching skeleton, animated crossfade)
```tsx
<AnimatePresence mode="wait">
  {loading ? (
    <motion.div key="skel" exit={{ opacity: 0 }} className="card-stat p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-stone-200 animate-pulse" />
        <div className="w-16 h-3 rounded bg-stone-200 animate-pulse" />
      </div>
      <div className="w-20 h-9 rounded bg-stone-200 animate-pulse" />
      <div className="w-32 h-3 mt-2 rounded bg-stone-200 animate-pulse" />
    </motion.div>
  ) : (
    <motion.div key="data" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
      <StatCard {...} />
    </motion.div>
  )}
</AnimatePresence>
```

## Example 4: Agent activity — turn the red noise into signal

### Before
```
imap_poller  GMAIL API ERROR  hace 1 d   ERROR
imap_poller  GMAIL API ERROR  hace 1 d   ERROR
imap_poller  GMAIL API ERROR  hace 2 d   ERROR
imap_poller  GMAIL API ERROR  hace 2 d   ERROR
imap_poller  IMAP EMAIL PROCESSED  hace 3 d  SUCCESS
```

Five identical-looking rows that screams "the system is broken". Reality: Gmail OAuth expired once, then same error repeated. The signal is "Gmail expired"; the noise is the repetition.

### After (group + dedup + recovery)
```tsx
const grouped = dedupeConsecutive(agentLogs, (l) =>
  `${l.agent_name}:${l.accion}:${l.resultado}`
)

return (
  <>
    {grouped.map(g => (
      <AgentLogRow
        agent={g.agent_name}
        action={g.accion}
        result={g.resultado}
        count={g.count}                          // "4 ocurrencias"
        firstAt={g.first_at}
        lastAt={g.last_at}
        recoveryAction={
          g.resultado === 'ERROR' && g.accion === 'GMAIL_API_ERROR'
            ? { label: 'Reconectar Gmail', href: '/api/gmail-auth' }
            : null
        }
      />
    ))}
  </>
)
```

Now the user sees:
```
imap_poller  GMAIL API ERROR  4× · hace 1 d  [Reconectar Gmail →]
imap_poller  IMAP EMAIL PROCESSED  hace 3 d  ✓
```

One actionable row instead of five red ones.

## Example 5: Add a global ⌘K

In `app/dashboard/layout.tsx`:

```tsx
import { CommandBar } from '@/components/CommandBar'
import { db } from '@/lib/supabase'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const recentRemesas = await db
    .from('remesas')
    .select('id, numero_invoice, proveedor:proveedores(nombre)')
    .order('updated_at', { ascending: false })
    .limit(20)

  return (
    <div className="flex h-screen">
      <SidebarNav />
      <main className="flex-1 overflow-auto">{children}</main>
      <CommandBar
        routes={[
          { href: '/dashboard/overview', label: 'Resumen' },
          { href: '/dashboard/remesas',  label: 'Remesas' },
          { href: '/dashboard/stock',    label: 'Stock' },
          { href: '/dashboard/actions',  label: 'Acciones' },
          { href: '/dashboard/agents',   label: 'Agentes' },
        ]}
        records={recentRemesas.data ?? []}
      />
    </div>
  )
}
```

Press ⌘K from anywhere → fuzzy search jumps to a remesa or page in <300ms.

## Audit walkthrough — what the agent does, step by step

When invoked on a real dashboard:

1. **Read** `app/dashboard/**/page.tsx` and `components/**/*.tsx`.
2. **Tag** each file with which of the 8 categories it triggers:
   - Has `<EmptyState ...>` but no `cta`? → category 1
   - Imports `framer-motion`? If no → category 3
   - Has `<table>` without `sticky top-0`? → category 7
   - Has `'Loading...'` text or `<Spinner />` over content? → category 5
3. **Output** a punch list:
   ```
   overview/page.tsx        [1, 3, 4]
   remesas/page.tsx         [1, 5, 7]
   stock/page.tsx           [1, 5]
   actions/page.tsx         [3]
   agents/page.tsx          [3, 6]
   layout.tsx               [8]
   ```
4. **Ask** the user which categories to apply (each becomes a commit).
5. **Apply** the chosen patterns, one diff per file. Reuse existing primitives (`Badge`, `EmptyState`, `card` class) — don't introduce new libraries unless required by the category (`framer-motion`, `cmdk`).
6. **Verify** by re-running step 2 — counts should drop to 0 for fixed categories.

This skill should never wholesale rewrite a working component. The output is *additive* and *surgical*.
