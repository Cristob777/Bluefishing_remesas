Run a full cybersecurity audit of the Bluefishing / Import Workflow Agents codebase.

## Sources this checklist is built from
- OWASP Top 10 2021 (A01–A10)
- OWASP ASVS v4.0 Level 1 & 2
- Next.js Security Headers documentation
- Supabase Security Guide (RLS, service role isolation)
- CWE/SANS Top 25 Most Dangerous Software Weaknesses
- Results of prior security scans on this project (sessions May 2026)

---

## 1. SECRET EXPOSURE — never in source code

Search ALL tracked files (`.ts`, `.tsx`, `.yaml`, `.json`, `.md`) excluding `node_modules`, `.next`:

```bash
# Real emails in code
grep -rn "OWNER_EMAILS\|FINANCE_EMAILS" --include="*.ts" apps/web/lib/ apps/web/app/

# Hardcoded API keys or tokens
grep -rn "sk-ant-\|eyJhbGci\|Bearer " --include="*.ts" --include="*.tsx" apps/web/ | grep -v "node_modules\|\.next\|test"

# process.env used client-side (only NEXT_PUBLIC_ is safe)
grep -rn "process\.env\." apps/web/app/ --include="*.tsx" | grep -v "NEXT_PUBLIC_"

# .env files accidentally tracked
git ls-files | grep "\.env"
```

**Pass**: Zero results on each. Any hit = CRITICAL.

---

## 2. AUTHENTICATION — every route protected

```bash
# Routes missing withAuth/withRole AND not using their own auth
for f in $(find apps/web/app/api -name "route.ts"); do
  echo "=== $f ===" && grep -n "export async function\|withAuth\|withRole\|CRON_SECRET\|x-webhook-secret" "$f"
done
```

**Pass criteria**:
- Every `export async function GET/POST` must show `withAuth`, `withRole`, `CRON_SECRET`, or `x-webhook-secret` on the same file
- No route returns data without auth check

---

## 3. RATE LIMITING — all mutation endpoints

```bash
grep -rn "checkRateLimit\|rateLimit" apps/web/app/api/ --include="*.ts"
```

**Expected**: Present in `webhook/email/route.ts`. Note: action routes rely on Supabase RLS + withRole as rate control. Flag any public-facing POST without rate limiting.

---

## 4. INPUT VALIDATION — Zod at every boundary

```bash
# Find routes that parse req.json() without Zod
grep -rn "req\.json()\|await req\.json" apps/web/app/api/ --include="*.ts"

# Find routes using readJsonBody (the safe wrapper)
grep -rn "readJsonBody\|validateWebhookPayload" apps/web/app/api/ --include="*.ts"
```

**Pass**: No bare `req.json()` on mutation routes. All should use `readJsonBody()` or explicit Zod schema.

---

## 5. SQL INJECTION — agent tool calls

```bash
# Find raw string interpolation in SQL passed to run_sql
grep -rn "run_sql\|supabase_execute_sql" apps/web/lib/agents/ --include="*.ts"
grep -rn "sql_text.*\${" apps/web/lib/ --include="*.ts"
```

**Check**: The `run_sql` database function (migration 004) blocks DDL/DELETE without WHERE. Verify agent tool handlers don't construct SQL from user input directly.

---

## 6. DEPENDENCY VULNERABILITIES

```bash
cd apps/web && npm audit --audit-level=high 2>&1 | head -30
```

**Pass**: Zero HIGH or CRITICAL vulnerabilities.

---

## 7. SECURITY HEADERS — every response

```bash
grep -n "Content-Security-Policy\|X-Frame-Options\|Strict-Transport\|X-Content-Type" apps/web/middleware.ts
```

**Required headers**:
- `Content-Security-Policy` with nonce ✓
- `X-Frame-Options: DENY` ✓
- `Strict-Transport-Security` ✓
- `X-Content-Type-Options: nosniff` ✓
- `Referrer-Policy` ✓

---

## 8. RLS — Supabase row-level security

```bash
grep -n "enable row level security\|create policy" supabase/migrations/001_initial_schema.sql
```

**Pass**: All 10 tables have RLS enabled. Policy `service_all` restricts to service_role. Anon key has zero write access.

---

## 9. CSRF — mutation routes

```bash
grep -n "isCsrfSafe\|sec-fetch-site\|origin" apps/web/lib/auth.ts apps/web/middleware.ts
```

**Pass**: `withAuth` enforces CSRF check via `isCsrfSafe()` for cookie-based requests. Bearer token requests are inherently CSRF-safe.

---

## 10. TIMING ATTACKS — secret comparison

```bash
grep -rn "timingSafeEqual\|=== .*secret\|=== .*token" apps/web/lib/ apps/web/app/api/ --include="*.ts"
```

**Pass**: All secret comparisons use `timingSafeEqual()`. No `===` comparison on secrets.

---

## 11. SENSITIVE DATA IN LOGS

```bash
grep -rn "console\.log\|console\.error" apps/web/lib/ apps/web/app/api/ --include="*.ts"
grep -rn "payload.*email\|payload.*password\|payload.*token" apps/web/lib/ --include="*.ts"
```

**Check**: No full email bodies, passwords, or tokens logged to console. `agent_logs` table stores structured payloads — ensure no raw credentials in payload field.

---

## 12. OAUTH CALLBACK VALIDATION

```bash
grep -n "state\|VALID_ACCOUNTS\|nonce" apps/web/app/api/gmail-callback/route.ts
```

**Pass**: `state` parameter validated against `VALID_ACCOUNTS` allowlist before token exchange.

---

## Severity classification

| Finding | Severity |
|---------|----------|
| Secret in source code | CRITICAL — fix immediately, rotate secret |
| Unprotected route | CRITICAL — add withAuth before next deploy |
| SQL injection via string concat | HIGH |
| Missing rate limit on public POST | HIGH |
| npm audit HIGH/CRITICAL | HIGH |
| Bare req.json() without validation | MEDIUM |
| Console.log with sensitive data | MEDIUM |
| Missing security header | LOW |
| In-memory rate limit (resets on cold start) | LOW — acceptable for Hobby plan |

---

## After running each check

For each CRITICAL or HIGH finding:
1. Fix immediately
2. Add to this checklist's "Known findings" section below
3. Commit with message `security: <description>`
4. Deploy before continuing

## Known findings (resolved)

- ✅ Real emails hardcoded in `lib/auth.ts` → moved to `OWNER_EMAILS`/`FINANCE_EMAILS` env vars (May 2026)
- ✅ `stock/[remesa_id]/route.ts` unprotected → added `withAuth`/`withRole` (May 2026)
- ✅ `gmail-callback/route.ts` open state param → validated against `VALID_ACCOUNTS` (May 2026)
- ✅ Supplier names in classifier system prompt → moved to `SUPPLIER_NAMES` env var (May 2026)
- ✅ Rate limit in-memory → documented as acceptable for current scale (May 2026)
