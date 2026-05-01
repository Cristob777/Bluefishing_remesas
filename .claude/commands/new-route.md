---
description: Scaffold a new secure API route for the Bluefishing dashboard
---

Create a new Next.js API route for the Bluefishing dashboard. Ask the user for:

1. **Route path** (e.g. `api/remesas/[id]/pagos`)
2. **HTTP method** (GET, POST, or both)
3. **Who can access it** (owner / finance / warehouse / any authenticated user)
4. **What it does** (reads or writes which Supabase tables)
5. **Expected request body fields** (for POST routes)

Then create `apps/web/app/{route}/route.ts` following this pattern:

```typescript
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { withRole, readJsonBody, type AuthUser } from '@/lib/auth'  // or withAuth for any user
import { rateLimit } from '@/lib/rateLimit'

const Schema = z.object({ /* fields */ })

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export const POST = withRole(['owner'], async (req: NextRequest, user: AuthUser) => {
  const limited = rateLimit(req, 'action', user.id)
  if (limited) return limited

  let body: unknown
  try { body = await readJsonBody(req, 10_000) }
  catch { return NextResponse.json({ error: 'Invalid or oversized request' }, { status: 400 }) }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.issues.map(i => i.message) },
      { status: 400 },
    )
  }

  // business logic here
  // always log to agent_logs with user.email
})
```

Rules to follow:
- Always use `withAuth` or `withRole` — never an unprotected export
- Always validate body with Zod — never raw `req.json()` passed to Supabase
- Always call `rateLimit` — 'action' for mutations, 'read' for GET
- Always log to `agent_logs` with `by: user.email`
- Use `SUPABASE_SERVICE_ROLE_KEY` server-side, never client-side anon key for writes
