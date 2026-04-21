# 🎣 Bluefishing AI Agents

> Sistema de automatización financiera con IA para importaciones desde China y Japón — construido para **MI TIENDA SPA / BLUEFISHING.CL**, Santiago Chile.

---

## ¿Qué hace este sistema?

Bluefishing importa productos de pesca deportiva desde proveedores en China y Japón. Cada importación involucra una cadena compleja de correos, transferencias bancarias, despachos aduaneros, recepciones de bodega y conciliación de costos.

Este sistema **automatiza completamente ese flujo** usando agentes de IA que monitorean los emails, extraen información financiera, calculan tipos de cambio en tiempo real y actualizan el estado de cada operación en una base de datos centralizada.

---

## Stack Técnico

| Capa | Tecnología |
|---|---|
| **Agentes IA** | Claude Managed Agents (Anthropic) |
| **Base de datos** | Supabase (PostgreSQL + Realtime + Storage) |
| **Frontend / API** | Next.js 15 App Router |
| **Hosting** | Vercel |
| **Base de Conocimiento** | Obsidian → Supabase (RAG sync) |
| **FX en tiempo real** | CMF Chile API |
| **Inventario** | Bsale API |

---

## Arquitectura de Agentes

```
Email de Proveedor (AMIGOS/MEIHO/VARIVAS)
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
│  📄 invoice_intake     → Detecta facturas    │
│  🏛️  customs_funds     → Provisiones AGENSA  │
│  📦 landed_cost        → Costo real por SKU  │
│  📋 din_reconciliation → Concilia DIN+pagos  │
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

## Flujo de Operaciones (5 etapas)

1. **Invoice Proveedor** → llega a Sebastian → agente extrae monto, moneda y condición de pago
2. **Orden de Pago** → Hector recibe alerta y emite transferencia al banco (30/70, 50/50, 100%)
3. **Provisión de Fondos AGENSA** → agente detecta urgencia (≤ 3 días) y alerta en tiempo real
4. **Recepción Bodega** → ingresa cantidad real recibida por SKU en Bsale, diferencias generan reclamo automático
5. **DIN + Facturas Aduana** → conciliación final provisión vs. costo real, archiva expediente completo

---

## Base de Conocimiento (RAG con Obsidian)

El sistema integra Obsidian como base de conocimiento ejecutiva. Las notas escritas en la bóveda local (reglas de proveedores, condiciones de pago, acuerdos comerciales) se sincronizan automáticamente a Supabase y los agentes las consultan antes de procesar cada operación.

```
Bóveda Obsidian (local OneDrive)
        │
        ▼ obsidian-sync (Node.js)
        │
        ▼
Supabase: tabla obsidian_knowledge
        │
        ▼ Tool Call en agente Claude
        │
        └── Agente toma decisiones basadas en reglas del negocio
```

---

## Costo de Producción

```
Vercel      → Hosting + Webhooks + Cron     (gratis)
Supabase    → DB + Auth + Realtime          (gratis hasta 500MB)
Anthropic   → 4 agentes Claude              (~$7 USD/mes)
─────────────────────────────────────────────────────
Total                                        ~$7 USD/mes
```

---

## Variables de Entorno

Ver `.env.example` — **nunca commitear credenciales reales**.

---

*Construido con Claude AI · Supabase · Next.js · Vercel*
