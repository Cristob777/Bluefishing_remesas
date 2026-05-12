# Import Workflow Agents

> An autonomous AI agent system that handles the full import operations cycle — from supplier invoices to landed cost per SKU — with zero manual data entry.

[![Stack](https://img.shields.io/badge/stack-Next.js%2015%20%C2%B7%20Claude%20Opus%20%C2%B7%20Supabase-blue)]()
[![Status](https://img.shields.io/badge/status-production-success)]()
[![Cost](https://img.shields.io/badge/runtime%20cost-~$7%20USD%2Fmonth-green)]()

<img width="1919" height="830" alt="image" src="https://github.com/user-attachments/assets/f15e4994-c48a-4d7f-9e8d-01dc81d328ca" />
<img width="1919" height="832" alt="image" src="https://github.com/user-attachments/assets/039701b3-cfdb-4425-b730-5a4e0fa8451c" />
<img width="1919" height="826" alt="image" src="https://github.com/user-attachments/assets/d4c026b6-4ba8-45c4-8022-94c399fa4ce9" />
<img width="1919" height="828" alt="image" src="https://github.com/user-attachments/assets/d6a48d95-976f-431b-97f8-d99e367f1812" />

---

## The problem

Every import shipment from Asia triggers a 5-stage chain of emails, bank transfers, customs clearances, and cost reconciliations. For most SMBs this happens manually:

- **8+ hours/month** copying invoices into Excel and calculating FX manually
- **Customs deadlines missed** because urgent emails get buried in the inbox
- **Real landed cost per SKU unknown** until weeks after the shipment arrives
- **Zero audit trail** for tax compliance
- **FX errors** on every bank transfer when rates aren't applied on the payment date

---

## The solution

Four specialised AI agents monitor the same inbox the owner reads, extract structured data from supplier emails and customs documents, calculate official FX rates, and update a real-time operations database — automatically.

Humans only intervene where it matters: approving transfers and making commercial decisions.

```
Supplier email (any country, any currency)
            │
            ▼
   ┌─────────────────────┐
   │  Gmail API + Cron   │  polls UNREAD → classifies with Claude Haiku
   │  /api/cron/poll     │
   └─────────┬───────────┘
             │
             ▼  classified as one of:
             │  INVOICE_PROVEEDOR · PROVISION_FONDOS
             │  DIN_DESPACHO · NOTA_DEBITO_AGENSA
             ▼
   ┌──────────────────────────────────────────┐
   │           AI AGENT PIPELINE              │
   │                                          │
   │  invoice_intake    → extracts invoice    │
   │  customs_funds     → flags urgent dates  │
   │  din_reconciliation→ matches provision   │
   │  nota_debito       → handles refunds     │
   │  landed_cost       → cost per SKU        │
   └─────────┬────────────────────────────────┘
             │
             ▼
   ┌──────────────────────────────────────────┐
   │  Supabase (Postgres + Realtime)          │
   │  shipments · payments · customs          │
   │  stock · documents · alerts · fx_rates   │
   └──────────────────────────────────────────┘
```

---

## Operations workflow (5 stages)

| Stage | Email trigger | Agent | Human action |
|------:|--------------|-------|--------------|
| **I** | Supplier invoice arrives | `invoice_intake` extracts amount, currency, payment terms | Owner confirms |
| **II** | Owner instructs finance team | — | Finance emits bank transfer (30/70, 50/50, 100%) |
| **III** | Customs agency requests funds | `customs_funds` flags ≤ 3-day deadlines, alerts if urgent | Finance pays provision |
| **IV** | Goods arrive at warehouse | — | Team counts; system records real qty |
| **V** | DIN + customs invoice arrives | `din_reconciliation` matches provision vs real cost → triggers `landed_cost` | Owner approves close |
| **V+** | Customs agency refund notice | `nota_debito` records credit, creates alert | Finance coordinates return |

Stock discrepancies in Stage IV automatically flag a supplier claim — no chasing needed.

---

## Tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| AI agents | Anthropic SDK — Claude Opus 4.7 | Full control over tool execution and agentic loop |
| Email classifier | Claude Haiku | Fast, cheap, ~$0.001/email |
| Database | Supabase (Postgres + Realtime + RLS) | Row-level security, instant subscriptions |
| Frontend | Next.js 15 App Router | Server components + API routes |
| Email ingestion | Gmail API (OAuth2) | Reliable from serverless; IMAP blocked by Gmail on cloud IPs |
| Hosting | Vercel | Edge functions, daily cron |
| FX rates | CMF Chile API | Official government source |
| Dev tool | Claude Code | Entire system built agent-to-agent |

---

## Security

- **Row-Level Security** on every table — service role only for agents
- **Timing-safe webhook auth** + sender domain whitelist
- **SQL sandbox** blocks DDL, DELETE/UPDATE without WHERE
- **Human-in-the-loop** for operations above configurable CLP threshold
- **Immutable audit trail** — every agent decision logged with input, output, reasoning
- **CSP + HSTS + X-Frame-Options** on every response
- **No hardcoded secrets** — all operational data in environment variables

---

## Production cost

```
Vercel      Hosting · webhooks · daily cron     free tier
Supabase    DB · auth · realtime · storage       free tier (≤ 500 MB)
Anthropic   5 agents · ~15 operations/month     ~$7 USD / month
────────────────────────────────────────────────────────────
Total                                            ~$7 USD / month
```

---

## Project structure

```
import-workflow-agents/
├── agents/                    # YAML specs for 5 Claude agents
├── supabase/migrations/       # Schema · RLS · security hardening · indexes
├── apps/
│   └── web/                   # Next.js 15 dashboard
│       ├── app/dashboard/     # Overview · Shipments · Stock · Actions · Agents
│       ├── app/api/           # Webhook · Actions · Cron · Gmail OAuth
│       ├── lib/agents/        # Agentic loop runner + all agent implementations
│       └── components/        # Design system v3
└── SETUP.md                   # Step-by-step deploy guide
```

---

## Quick start

```bash
# 1. Clone and install
git clone https://github.com/Cristob777/Bluefishing_remesas
cd apps/web && npm install

# 2. Configure environment
cp .env.example .env.local
# Fill: ANTHROPIC_API_KEY · SUPABASE_* · WEBHOOK_SECRET
#       OWNER_EMAILS · FINANCE_EMAILS · SUPPLIER_NAMES
#       GOOGLE_CLIENT_ID · GOOGLE_CLIENT_SECRET

# 3. Apply database migrations
# Run supabase/migrations/*.sql in your Supabase SQL Editor

# 4. Start dev server
npm run dev

# 5. Connect Gmail accounts
# Visit /api/gmail-auth?account=owner → authorize → copy refresh token → add to env
```

Full setup including Gmail OAuth flow and Vercel deploy: [`SETUP.md`](./SETUP.md)

---

## What makes this different

Most automation tools (Zapier, Make, n8n) connect existing apps. This system **understands** unstructured emails in any language, extracts structured financial data, applies domain-specific business rules (FX on payment date, not invoice date), and chains agents together automatically.

The entire codebase was built using Claude Code — agent-to-agent development from architecture to production in a single laptop session.

---

## Adapt to your business

All operational data is in environment variables — no hardcoded company names, emails, or bank details. To adapt:

1. Set `OWNER_EMAILS`, `FINANCE_EMAILS`, `SUPPLIER_NAMES` in Vercel
2. Set `CUSTOMS_AGENCY_EMAIL`, `CUSTOMS_AGENCY_NAME`
3. Connect your Gmail accounts via the OAuth flow
4. Done — agents start classifying your emails immediately

---

## License

MIT — free to use, adapt, and deploy.

---

<sub>Built with Claude Opus 4.7 · Claude Code · Deployed from a laptop · ~$7/month in production.</sub>
