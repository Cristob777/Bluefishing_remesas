---
description: Scan the entire codebase for exposed real data and security issues
---

Run a full security audit on the Bluefishing project. Check for:

## 1. Hardcoded real data (must NOT appear in tracked files)
Search all `.ts`, `.tsx`, `.yaml`, `.yml`, `.json`, `.md` files (excluding node_modules, .next, CLAUDE.md, PROJECT.md) for:
- Real emails: `sebastian.caceres@bluefishing.cl`, `sebastiancaceresortizar@gmail.com`, `hector@bluefishing.cl`, `amigoscn.coco@gmail.com`, `contabilidad@agensa.cl`
- Real RUTs: `76.999.020-8`, `88.527.900-7`
- Real bank accounts: `15015629`, `101-01393-00`, `200863682`
- Real supplier names in agent YAMLs: `AMIGOS COMPANY LIMITED`, `MEIHO CHEMICAL INDUSTRY`, `VARIVAS CO`

## 2. Unprotected API routes
Check all files in `apps/web/app/api/` — every `export async function GET/POST` must use `withAuth` or `withRole` from `@/lib/auth`, OR be the webhook route (which uses its own secret-based auth). Report any route that is missing auth.

## 3. Secrets in environment variable usage
Search for any `process.env.` values that are used directly in client-side code (files with `'use client'` at the top). Only `NEXT_PUBLIC_*` vars are safe to use client-side.

## 4. Direct DB inserts without schema validation
Search for `.insert(body)` or `.insert(req.json())` patterns — these bypass Zod validation and are dangerous.

## 5. Rate limiting gaps
Check all POST routes in `apps/web/app/api/actions/` — each must call `rateLimit()` from `@/lib/rateLimit`.

Report findings grouped by severity: CRITICAL / HIGH / LOW.
If everything is clean, confirm: "✓ No security issues found."
