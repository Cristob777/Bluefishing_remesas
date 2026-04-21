# BLUEFISHING AGENTS — Setup Guide
## De cero a producción

---

## Paso 1 — Supabase (10 min)

1. supabase.com → New project → "bluefishing-prod"
2. Settings → Database → copiar `DATABASE_URL`
3. Settings → API → copiar `URL` y `anon key` y `service_role key`
4. SQL Editor → pegar y ejecutar `supabase/migrations/001_initial_schema.sql`
5. Realtime → Tables → habilitar `remesas`, `alertas`, `agent_logs`

---

## Paso 2 — GitHub (5 min)

```bash
cd bluefishing-v2
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/TU_USER/bluefishing-agents.git
git push -u origin main
```

---

## Paso 3 — Vercel (10 min)

1. vercel.com → New Project → Import from GitHub → bluefishing-agents
2. Framework: Next.js
3. Build command: `cd apps/web && npm run build`
4. Root directory: `apps/web`
5. Agregar variables de entorno (copiar de .env.example)
6. Deploy

URL resultado: `https://bluefishing-agents.vercel.app`

---

## Paso 4 — Claude Managed Agents (30 min)

### 4a. Crear Environment

platform.claude.com → Environments → New

```yaml
name: bluefishing-prod
packages:
  - python3
  - node18
network_access:
  - api.supabase.co
  - api.cmfchile.cl
  - api.bsale.io
environment_variables:
  SUPABASE_URL:      <tu URL>
  SUPABASE_KEY:      <service key>
  CMF_API_KEY:       <tu key>
  BSALE_TOKEN:       <tu token>
```

### 4b. Crear los 4 agentes

Para cada archivo en `/agents/*.yaml`:
platform.claude.com → Agents → New Agent

1. **Invoice Intake**: copiar system_prompt de `agents/invoice_intake.yaml`
   → Guardar → copiar Agent ID → pegar en Vercel como `AGENT_ID_INVOICE_INTAKE`

2. **Customs Funds**: copiar de `agents/customs_funds.yaml`
   → Guardar → copiar Agent ID → `AGENT_ID_CUSTOMS_FUNDS`

3. **Landed Cost**: copiar de `agents/landed_cost.yaml`
   → Guardar → copiar Agent ID → `AGENT_ID_LANDED_COST`

4. **DIN Reconciliation**: copiar de `agents/din_reconciliation.yaml`
   → Guardar → copiar Agent ID → `AGENT_ID_DIN_RECONCILIATION`

### 4c. Credential Vaults

platform.claude.com → Credential Vaults → New

```
gmail_sebastian  → OAuth2 token de sebastian.caceres@bluefishing.cl
gmail_hector     → OAuth2 token de hector@bluefishing.cl
bsale_token      → access token de Bsale
cmf_api_key      → key de CMF Chile
```

---

## Paso 5 — Gmail webhook (20 min)

Dos opciones:

### Opción A — Google Cloud Pub/Sub (recomendado)
1. Google Cloud Console → Pub/Sub → crear topic `bluefishing-emails`
2. Gmail API → Watch → apuntar a tu topic
3. Pub/Sub → crear subscription → push a:
   `https://bluefishing-agents.vercel.app/api/webhook/email`
4. Configurar para las dos cuentas (Sebastian y Hector)

### Opción B — Polling simple (para arrancar hoy)
Usar un cron job en Vercel:
```json
// vercel.json — agregar:
"crons": [
  {
    "path": "/api/cron/poll-gmail",
    "schedule": "*/5 * * * *"
  }
]
```

---

## Paso 6 — Verificar

```bash
# Test webhook manual
curl -X POST https://bluefishing-agents.vercel.app/api/webhook/email \
  -H "x-webhook-secret: TU_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "email_id": "test-001",
    "email_from": "amigoscn.coco@gmail.com",
    "email_subject": "PROFORMA INVOICE 2026.4.8",
    "email_body": "Coco - pagar 2933 usd",
    "attachment_text": "INVOICE NO: AMG20260408 TOTAL: 9779 USD",
    "attachment_filename": "PROFORMA_INVOICE.pdf",
    "account": "sebastian"
  }'
```

Resultado esperado:
```json
{
  "status": "triggered",
  "category": "INVOICE_PROVEEDOR",
  "session_id": "session_..."
}
```

Ver en Supabase → documentos → nuevo registro creado.

---

## Stack final

```
GitHub          → código fuente
Vercel          → frontend + API routes + webhooks (gratis)
Supabase        → DB + auth + realtime (gratis hasta 500MB)
platform.claude.com → 4 agentes corriendo (pay-per-use ~$7/mes)
```

**Costo total producción: ~$7 USD/mes**
