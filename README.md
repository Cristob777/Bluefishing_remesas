# Bluefishing AI Agents

> Autonomous financial operations for international fishing-gear imports.
> Built for **MI TIENDA SPA / BLUEFISHING.CL** — Santiago, Chile.

[![Status](https://img.shields.io/badge/status-production-success)]()
[![Stack](https://img.shields.io/badge/stack-Next.js%2015%20%C2%B7%20Claude%20%C2%B7%20Supabase-blue)]()
[![Cost](https://img.shields.io/badge/runtime%20cost-~$7%20USD%2Fmonth-green)]()
<img width="1919" height="830" alt="image" src="https://github.com/user-attachments/assets/f15e4994-c48a-4d7f-9e8d-01dc81d328ca" />

<img width="1919" height="832" alt="image" src="https://github.com/user-attachments/assets/039701b3-cfdb-4425-b730-5a4e0fa8451c" />
<img width="1919" height="826" alt="image" src="https://github.com/user-attachments/assets/d4c026b6-4ba8-45c4-8022-94c399fa4ce9" />
<img width="1919" height="828" alt="image" src="https://github.com/user-attachments/assets/d6a48d95-976f-431b-97f8-d99e367f1812" />
<img width="1918" height="826" alt="image" src="https://github.com/user-attachments/assets/e029cb28-7bcd-47a9-88c4-bd644f1e5a78" />


---


## The problem

Every imported shipment from Asia triggers a 5-stage chain of emails, bank transfers, customs clearances and cost reconciliations. Until now, this happened manually:

- **8+ hours per month** of the owner copying invoices into Excel
- **Manual FX calculations** with risk of errors on every transfer
- **Customs deadlines lost** in inbox noise (mercadería at risk of retention)
- **Real landed cost per SKU** unknown until weeks after the shipment arrived
- **Zero audit trail** for SII (Chilean tax authority) compliance

---

## The solution

Four specialised AI agents monitor the same emails the owner reads, extract structured data from PDFs and Excels in any language, calculate official FX rates from the CMF Chile API, and update a real-time operations database. Humans only intervene where it matters: approving transfers and making commercial decisions.

```
Supplier email (AMIGOS · MEIHO · VARIVAS)
            │
            ▼
   ┌─────────────────────┐
   │  Next.js Webhook    │ ◄── Gmail Pub/Sub
   │  /api/webhook/email │
   └─────────┬───────────┘
             │
             ▼
   ┌──────────────────────────────────────────┐
   │        CLAUDE MANAGED AGENTS             │
   │                                          │
   │  Invoice Intake      → invoices in       │
   │  Customs Funds       → AGENSA urgency    │
   │  Landed Cost         → real cost per SKU │
   │  DIN Reconciliation  → close the file    │
   └─────────┬────────────────────────────────┘
             │
             ▼
   ┌──────────────────────────────────────────┐
   │  Supabase (Postgres + Realtime)          │
   │  remesas · pagos · provisiones · stock   │
   │  documentos · alertas · agent_logs · fx  │
   └──────────────────────────────────────────┘
```

---

## Operations flow

| Stage | Trigger | Agent | Human action |
|------:|---------|-------|--------------|
| **I** | Supplier invoice | `invoice_intake` extracts amount, currency, payment terms | Sebastián confirms |
| **II** | Sebastián instructs Hector | — | Hector emits bank order (30/70, 50/50, 100%) |
| **III** | AGENSA funds request | `customs_funds` flags ≤ 3-day deadlines in real time | Hector pays provision |
| **IV** | Goods arrive at warehouse | — | Anyone counts; system enters real qty into Bsale |
| **V** | DIN + customs invoices | `din_reconciliation` matches provision vs real cost | Sebastián approves close |

A discrepancy in Stage IV automatically prepares a supplier claim draft — the owner reviews and sends.

---

## Tech stack

| Layer | Choice | Why |
|------|--------|-----|
| AI agents | Custom agentic loop — Anthropic SDK (Opus 4.7) | Full control over tool execution and retry logic |
| Database | Supabase (Postgres + Realtime) | RLS, instant subscriptions, free tier |
| Frontend & API | Next.js 15 App Router | Server components + edge functions |
| Hosting | Vercel | Push-to-deploy, global edge |
| FX rates | CMF Chile API | Official source, no third-party risk |
| Inventory | Bsale REST API | The ERP already in use |
| Knowledge base | Obsidian → Supabase sync | Business rules as RAG context |
| Dev environment | Antigravity + Claude Code | Multi-agent IDE workflow |

---

## Knowledge base (RAG)

Business rules live as Markdown notes in a local Obsidian vault — supplier terms, payment conditions, commercial agreements, customs codes. A lightweight Node sync pushes them into Supabase, where agents query them before deciding anything non-trivial.

```
Obsidian vault (local)
        │
        ▼  obsidian-sync (Node.js)
        ▼
Supabase: obsidian_knowledge table
        │
        ▼  tool call inside agent runtime
        ▼
Agent decisions grounded in real business rules
```

This means non-technical staff can update the AI's behaviour by editing a note, not by writing code.

---

## Security & compliance

- **Row-Level Security** enabled on every table
- **Service role isolation** — webhooks only, no public writes
- **5-layer webhook protection**: rate limiting → timing-safe auth → payload size limits → structural validation → input sanitization
- **Approvals over CLP $5M** require explicit human sign-off
- **Immutable audit trail** in `agent_logs` — every agent decision logged with reasoning, input, output, latency
- **SQL execution sandbox** blocks DDL, DELETE/UPDATE without WHERE, file access functions
- **HSTS · CSP · X-Frame-Options DENY** on every response

---

## Production cost

```
Vercel        Hosting · webhooks · cron        free tier
Supabase      DB · auth · realtime · storage   free tier (≤ 500 MB)
Anthropic     4 Claude agents · ~15 ops/mo     ~$7 USD / month
──────────────────────────────────────────────────────────
Total runtime                                  ~$7 USD / month
```

For development, a single Claude Pro plan ($20/month) is sufficient.

---

## Project structure

```
bluefishing-agents/
├── agents/                    # YAML definitions for 4 Claude agents
├── supabase/migrations/       # Schema + RLS + security hardening
├── apps/
│   ├── web/                   # Next.js 15 dashboard
│   │   ├── app/dashboard/     # Overview · Remesas · Stock · Acciones · Agentes
│   │   ├── app/api/           # Webhooks · Actions · Cron
│   │   ├── lib/agents/        # Runner + tools (FX, Supabase RPC)
│   │   └── components/        # UI primitives + design system
│   └── obsidian-sync/         # Node service: vault → Supabase
├── CLAUDE.md                  # Project context for Claude Code
└── SETUP.md                   # Step-by-step deployment guide
```

---

## Quick start

```bash
# 1. Clone and install
git clone https://github.com/your-org/bluefishing-agents
cd bluefishing-agents/apps/web && npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in: ANTHROPIC_API_KEY, SUPABASE_*, WEBHOOK_SECRET, CMF_API_KEY

# 3. Run database migrations
npx supabase db push

# 4. Start development server
npm run dev
```

Full setup including Gmail OAuth, Vercel deploy, and Managed Agents configuration is documented in [`SETUP.md`](./SETUP.md).

---

## Roadmap

- [x] 4 agents in production with realtime DB
- [x] Human-in-the-loop action centre (9 flows)
- [x] Stock receiving with automatic claim drafts
- [x] Obsidian → Supabase RAG sync
- [x] Gmail OAuth for both monitored accounts
- [x] Bsale automatic cost-price sync
- [x] Mobile-optimised counting interface for warehouse staff
- [x] WhatsApp alerts for urgent provisions

---

## License

Private project — all rights reserved.
For commercial enquiries: **cristobal.caceres@mayor.cl**

---

<sub>Built with Claude Opus 4.7 · Designed in Antigravity · Deployed from a single laptop.</sub>
*Built with Claude AI · Supabase · Next.js · Vercel*
