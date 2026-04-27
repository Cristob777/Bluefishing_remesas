# Bluefishing AI Agents

> AI-powered financial automation for fishing gear imports from China and Japan — built for **MI TIENDA SPA / BLUEFISHING.CL**, Santiago Chile.

---

## What does this system do?

Bluefishing imports sporting fishing products from suppliers in China and Japan. Each shipment involves a complex chain of emails, bank transfers, customs clearances, warehouse receiving, and cost reconciliation.

This system **fully automates that workflow** using AI agents that monitor emails, extract financial data, calculate real-time exchange rates, and update the status of every operation in a centralized database.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **AI Agents** | Claude Managed Agents (Anthropic) |
| **Database** | Supabase (PostgreSQL + Realtime + Storage) |
| **Frontend / API** | Next.js 15 App Router |
| **Hosting** | Vercel |
| **Knowledge Base** | Obsidian → Supabase (RAG sync) |
| **Live FX rates** | CMF Chile API |
| **Inventory** | Bsale API |

---

## Agent Architecture

```
Supplier Email (AMIGOS / MEIHO / VARIVAS)
        │
        ▼
┌─── Next.js Webhook ───┐
│   /api/webhook/email  │ ←── Gmail Pub/Sub
└───────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────┐
│           CLAUDE MANAGED AGENTS              │
│                                              │
│  📄 invoice_intake     → Detects invoices    │
│  🏛️  customs_funds     → AGENSA provisions   │
│  📦 landed_cost        → Real cost per SKU   │
│  📋 din_reconciliation → Reconciles DIN+pays │
└──────────────────────────────────────────────┘
        │
        ▼
┌─── Supabase ──────────────────────────────────┐
│  remesas · pagos · provisiones_fondos         │
│  stock_items · documentos · alertas           │
│  agent_logs · fx_rates · obsidian_knowledge   │
└───────────────────────────────────────────────┘
```

---

## Operations Flow (5 stages)

1. **Supplier Invoice** → arrives to Sebastian → agent extracts amount, currency, and payment terms
2. **Payment Order** → Hector receives alert and issues bank transfer (30/70, 50/50, 100%)
3. **AGENSA Funds Provision** → agent detects urgency (≤ 3 days) and alerts in real time
4. **Warehouse Receiving** → actual quantity received per SKU is entered in Bsale; discrepancies trigger automatic supplier claims
5. **DIN + Customs Invoices** → final reconciliation of provision vs. real cost; full shipment file archived

---

## Knowledge Base (RAG with Obsidian)

The system integrates Obsidian as an executive knowledge base. Notes written in the local vault (supplier rules, payment terms, commercial agreements) are automatically synced to Supabase and queried by agents before processing each operation.

```
Obsidian Vault (local OneDrive)
        │
        ▼ obsidian-sync (Node.js)
        │
        ▼
Supabase: obsidian_knowledge table
        │
        ▼ Tool call in Claude agent
        │
        └── Agent makes decisions based on business rules
```

---

## Production Cost

```
Vercel      → Hosting + Webhooks + Cron     (free)
Supabase    → DB + Auth + Realtime          (free up to 500MB)
Anthropic   → 4 Claude agents               (~$7 USD/month)
─────────────────────────────────────────────────────────────
Total                                        ~$7 USD/month
```

---

## Environment Variables

See `.env.example` — **never commit real credentials**.

---

*Built with Claude AI · Supabase · Next.js · Vercel*
