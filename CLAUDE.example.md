# PROJECT — Claude Code Master File (template)

> Copy this file to `CLAUDE.md` and fill in your real values.
> `CLAUDE.md` is gitignored — never commit it.

## Company
- Legal name: YOUR_COMPANY_NAME (RUT XX.XXX.XXX-X)
- Brand: YOUR_BRAND.CL
- Industry: [describe]
- Address: [address]

## People
- **OWNER**: manages suppliers, receives invoices, instructs finance manager.
  Emails: owner@company.cl / owner@gmail.com
- **FINANCE MANAGER**: receives payment instructions, issues bank orders, manages customs.
  Email: finance@company.cl

## Suppliers
| Supplier | Country | Currency | Contact |
|---|---|---|---|
| SUPPLIER_1 | China | USD/CNH | Name — email@supplier.com |
| SUPPLIER_2 | Japan | JPY | — |
| SUPPLIER_3 | Japan | JPY | — |

## Customs Agency
AGENCY_NAME LTDA.
- RUT: XX.XXX.XXX-X · accounting@agency.cl
- Bank accounts: BANK_1 XXXXXXXX / BANK_2 XXX-XXXXX-XX / BANK_3 XXXXXXXXX

## Operations Flow (5 stages)
```
I.   Supplier invoice → arrives to OWNER → calculates with Excel
     → emails FINANCE MANAGER "pay X usd/yen"

II.  FINANCE MANAGER issues Payment Order to bank
     Variable terms: 30/70, 50/50, 100%, multiple installments

III. Customs funds provision → arrives to FINANCE MANAGER (or OWNER or both)
     URGENT if expires in ≤ 3 days

IV.  Goods received → WAREHOUSE counts by SKU
     → Enters Bsale with actual quantity received
     → If difference → notify OWNER → OWNER files supplier claim

V.   DIN + Customs invoices → arrives to FINANCE MANAGER
     Reconcile paid provision vs real cost
     Archive complete file
```

## Tech Stack
```
AGENTS:    Custom agentic loop — Anthropic SDK (claude-opus-4-7)
DB:        Supabase (PostgreSQL + Auth + Storage + Realtime)
FRONTEND:  Next.js 15 App Router → Vercel
TRIGGERS:  Next.js API Routes (webhooks) → Vercel
CODE:      GitHub → auto-deploy
```

## Agents — 4 defined in /agents/
- invoice_intake.yaml     → detects invoices in owner's email
- customs_funds.yaml      → detects provisions from customs agency
- din_reconciliation.yaml → detects DIN post-dispatch
- landed_cost.yaml        → calculates real cost per SKU

## Currencies
USD, JPY, EUR, CNY, CNH (CNH = CNY alias for FX)
Official FX: CMF Chile API — https://api.cmfchile.cl

## Critical rules
1. FX = date of PAYMENT, not the invoice
2. Payment schedule is variable per supplier (not always 30/70)
3. Bsale uses cantidad_recibida, never cantidad_invoice
4. Stock differences → notify OWNER → parallel claim, don't block
5. Customs provisions → may arrive to OWNER, FINANCE, or both → deduplicate
6. Operations > CLP 5M → require human approval
7. Immutable audit trail on all financial operations

## Commands
```bash
npm run dev        # Next.js :3000
npm run db:migrate # apply Supabase migrations
git push origin main  # auto-deploy Vercel + agents
```

## Required environment variables
See .env.example — never commit real values.
Secrets in Vercel dashboard.
