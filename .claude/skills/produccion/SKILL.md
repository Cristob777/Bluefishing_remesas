---
name: produccion
description: Runs the full production readiness checklist for the Import Ops / Bluefishing platform — renames proxy.ts to middleware.ts, audits Vercel env vars, checks Supabase migrations, verifies Gmail OAuth, validates Claude Managed Agents YAMLs, scans for secrets, commits and pushes to main, and confirms Vercel deployment. Use when user says "pasar a producción", "production checklist", "listo para producción", "ir a prod", or "qué falta para producción".
---

# Producción — Import Ops Readiness

## Quick start

```
/produccion
```

Runs all 8 steps sequentially. Reports ✅ / ❌ / ⚠️ for each. Stops and asks before destructive changes (rename, push).

## Steps

### 1 — Rename `proxy.ts` → `middleware.ts`

```bash
# apps/web/proxy.ts must be apps/web/middleware.ts for Next.js Edge runtime
mv apps/web/proxy.ts apps/web/middleware.ts
# Update any import references
grep -r "from.*proxy" apps/web --include="*.ts" --include="*.tsx"
```

Verify the default export is correct for Next.js middleware:
```typescript
// Must export: default function middleware() + export const config
```

---

### 2 — Vercel env vars audit

Check `bluefishing-ai-agents` project (`prj_9ajEtuoqYhYIDZAoUO8IW9Ult9LY`, team `team_PWWCOYMDFeY8r2AGYA67VQm9`) has ALL of:

**Critical (blocks operation if missing):**
- `WEBHOOK_SECRET` — generate: `openssl rand -hex 32`
- `CRON_SECRET` — generate: `openssl rand -hex 32`
- `NEXTAUTH_URL` — `https://bluefishing-ai-agents.vercel.app`
- `ANTHROPIC_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Gmail (blocks email ingestion if missing):**
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GMAIL_REFRESH_TOKEN_OPS`
- `GMAIL_EMAIL_OPS`

**Operations (degrades classifier accuracy if missing):**
- `CUSTOMS_AGENCY_EMAIL` → `contabilidad@agensa.cl`
- `SUPPLIER_EMAIL_1` → `amigoscn.coco@gmail.com`
- `SUPPLIER_EMAIL_2` → MEIHO email
- `SUPPLIER_EMAIL_3` → VARIVAS email
- `OWNER_EMAILS` → `sebastian.caceres@bluefishing.cl`
- `FINANCE_EMAILS` → `hector@bluefishing.cl`

Use Vercel MCP tool `list_projects` + `get_project` to verify, or instruct user to check Vercel dashboard.

---

### 3 — Supabase migrations

```bash
# List migrations in repo
ls supabase/migrations/*.sql | sort

# Check which are applied in production DB
# Use Supabase MCP: mcp__supabase__list_migrations project_id=tdpjmshgcrwtumqambgp
# OR instruct user to run:
supabase db push --linked
```

Required migrations (in order): 000 → 001 → 002 → 003 → 004 → 005 → 006 → 007 → 008 → 009 → 010 → 011 → 012 → 013 → 014

---

### 4 — Gmail OAuth

Verify connection at `/dashboard/settings` or check DB:
```sql
SELECT account_label, email, created_at FROM gmail_accounts;
```

If not connected:
```
1. Go to /api/gmail-auth?account=ops  (with Authorization: Bearer CRON_SECRET)
2. Complete OAuth flow
3. Verify GMAIL_REFRESH_TOKEN_OPS is saved
```

---

### 5 — Claude Managed Agents

Check all 4 YAML files are complete:
```bash
ls agents/*.yaml
# Required: invoice_intake.yaml, customs_funds.yaml,
#           din_reconciliation.yaml, landed_cost.yaml
```

Each must have: `name`, `model`, `system_prompt`, `tools`, `triggers`, `environment_variables`.

Agents must be uploaded to `platform.claude.com` with correct env vars pointing to production Supabase + webhook URL.

---

### 6 — Security scan

```bash
# No hardcoded secrets
grep -r "eyJhbGci\|sk-ant\|supabase\.co" apps/web/app apps/web/lib apps/web/components \
  --include="*.ts" --include="*.tsx" \
  --exclude-dir=node_modules

# No .env.local committed
git status --short | grep "\.env"

# No real company data in source
grep -ri "bluefishing\|caceres\|agensa\|amigos" apps/web/lib apps/web/app \
  --include="*.ts" --include="*.tsx" \
  --exclude-dir=node_modules | grep -v "test\|mock\|demo\|example\|CLAUDE.md"
```

---

### 7 — Commit & push

```bash
git add -A
git status  # review before commit
git commit -m "chore: production readiness — middleware rename + config"
git push origin HEAD:main
```

---

### 8 — Confirm Vercel deployment

Use Vercel MCP `get_project` on `prj_9ajEtuoqYhYIDZAoUO8IW9Ult9LY`:
- `latestDeployment.readyState` must be `READY`
- `latestDeployment.target` must be `production`

Then verify live:
```bash
curl -s https://bluefishing-ai-agents.vercel.app/api/actions/pending \
  -H "Authorization: Bearer $CRON_SECRET" | jq .
```

## Checklist output format

Report results as:
```
✅ Step 1 — middleware.ts renamed
✅ Step 2 — all 17 env vars present
❌ Step 3 — 2 migrations pending (013, 014)
⚠️  Step 4 — Gmail not connected, requires manual OAuth
✅ Step 5 — all 4 agents configured
✅ Step 6 — no secrets in source
✅ Step 7 — pushed cf4bd9f
✅ Step 8 — READY at bluefishing-ai-agents.vercel.app
```

Stop at any ❌ and provide exact fix instructions before continuing.
