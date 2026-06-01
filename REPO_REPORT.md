# REPO_REPORT.md — Bluefishing AI Agents

> Auditoría de lectura completa del repositorio.  
> Generado: 2026-05-30. Rama: `prod-es-ux-merge`.  
> Raíz del repo: `c:\Users\Crist\OneDrive\Escritorio\Bluefishing Ai Agents\.claude\worktrees\bold-pasteur-88156c`

---

## 1. Estructura

### Árbol completo (excluyendo node_modules, .next, .git)

```
.
├── .claude/
│   ├── .gitignore
│   ├── settings.json
│   ├── commands/
│   │   ├── check-remesa.md
│   │   ├── cybersecurity.md
│   │   ├── deploy.md
│   │   ├── new-agent.md
│   │   ├── new-route.md
│   │   └── security-scan.md
│   └── skills/
│       ├── caveman/SKILL.md
│       ├── diagnose/SKILL.md (+scripts/)
│       ├── grill-me/SKILL.md
│       ├── grill-with-docs/SKILL.md (+ADR-FORMAT.md, CONTEXT-FORMAT.md)
│       ├── improve-codebase-architecture/SKILL.md (+DEEPENING.md, INTERFACE-DESIGN.md, LANGUAGE.md)
│       ├── setup-matt-pocock-skills/SKILL.md (+domain.md, issue-tracker-*.md, triage-labels.md)
│       ├── tdd/SKILL.md (+deep-modules.md, interface-design.md, mocking.md, refactoring.md, tests.md)
│       ├── to-issues/SKILL.md
│       ├── to-prd/SKILL.md
│       ├── triage/SKILL.md (+AGENT-BRIEF.md, OUT-OF-SCOPE.md)
│       ├── write-a-skill/SKILL.md
│       └── zoom-out/SKILL.md
├── .agents/
│   └── skills/          ← Mirror de .claude/skills/ (sin zoom-out ni setup-matt-pocock-skills)
├── agents/
│   ├── customs_funds.yaml
│   ├── din_reconciliation.yaml
│   ├── invoice_intake.yaml
│   └── landed_cost.yaml
├── apps/
│   └── web/
│       ├── .env.example
│       ├── .gitignore
│       ├── next.config.js
│       ├── postcss.config.js
│       ├── tailwind.config.js
│       ├── vercel.json
│       ├── package.json
│       ├── proxy.ts                        ← Next.js middleware
│       ├── app/
│       │   ├── page.tsx
│       │   ├── api/
│       │   │   ├── agents/status/route.ts
│       │   │   ├── actions/
│       │   │   │   ├── accept-stock/route.ts
│       │   │   │   ├── approve-payment/route.ts
│       │   │   │   ├── archivar-expediente/route.ts
│       │   │   │   ├── confirmar-pago-bancario/route.ts
│       │   │   │   ├── confirmar-provision/route.ts
│       │   │   │   ├── instruccion-pago/route.ts
│       │   │   │   ├── nota-agensa/route.ts
│       │   │   │   ├── orden-pago/route.ts
│       │   │   │   ├── pending/route.ts
│       │   │   │   ├── reclamo-proveedor/route.ts
│       │   │   │   ├── resolve-alert/route.ts
│       │   │   │   └── vincular-despacho/route.ts
│       │   │   ├── classifier/test/route.ts
│       │   │   ├── cron/poll-imap/route.ts
│       │   │   ├── documents/route.ts
│       │   │   ├── gmail-auth/route.ts
│       │   │   ├── gmail-callback/route.ts
│       │   │   ├── remesas/route.ts
│       │   │   ├── rules/route.ts
│       │   │   ├── setup/
│       │   │   │   ├── gmail-filters/route.ts
│       │   │   │   └── instructions/route.ts
│       │   │   ├── stock/
│       │   │   │   ├── [remesa_id]/route.ts
│       │   │   │   └── all/route.ts
│       │   │   └── webhook/email/route.ts
│       │   ├── auth/callback/route.ts
│       │   ├── dashboard/
│       │   │   ├── overview/page.tsx
│       │   │   └── settings/page.tsx
│       │   └── login/page.tsx
│       ├── components/
│       │   ├── DashboardTopbar.tsx
│       │   ├── SidebarNav.tsx
│       │   ├── remesas/RemesaDetail.tsx
│       │   ├── stock/CountModal.tsx
│       │   └── ui/
│       │       ├── AgentHeartbeat.tsx
│       │       ├── Badge.tsx
│       │       ├── Button.tsx
│       │       ├── Card.tsx
│       │       └── StatCard.tsx
│       ├── lib/
│       │   ├── ai.ts
│       │   ├── audit.ts
│       │   ├── auth.ts
│       │   ├── config.ts
│       │   ├── errors.ts
│       │   ├── rateLimit.ts
│       │   ├── supabase.ts
│       │   ├── utils.ts
│       │   ├── validate.ts
│       │   ├── agents/
│       │   │   ├── customs-funds.ts
│       │   │   ├── din-reconciliation.ts
│       │   │   ├── invoice-intake.ts
│       │   │   ├── landed-cost.ts
│       │   │   ├── nota-debito.ts
│       │   │   ├── runner.ts
│       │   │   └── tools.ts
│       │   └── services/
│       │       └── gmail-extractor.ts
│       └── types/
│           └── index.ts
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_obsidian_knowledge.sql
│   │   ├── 003_sql_executor.sql
│   │   ├── 004_sql_security.sql
│   │   ├── 005_performance_indexes.sql
│   │   ├── 006_nota_debito.sql
│   │   ├── 007_run_sql_hardening.sql
│   │   ├── 007_to_009_combined.sql      ← convenience rollup (no es migración nueva)
│   │   ├── 008_user_roles.sql
│   │   ├── 009_rls_completion.sql
│   │   ├── 010_gmail_accounts.sql
│   │   ├── 011_nota_credito_agensa.sql
│   │   ├── 012_reglas_table.sql
│   │   └── 013_google_document_ai_id.sql
│   └── seed.dev.sql
├── CLAUDE.example.md
└── README.md
```

**Notas estructurales:**

- No existe `CLAUDE.md` en el repo (está en `.gitignore`). Solo existe `CLAUDE.example.md`.
- No existe `SETUP.md` en el repo (referenciado en README.md como `[SETUP.md](./SETUP.md)`).
- No existe directorio `apps/web/lib/managed-agents.ts` — el archivo está en `apps/web/lib/managed-agents.ts` (raíz de lib).
- El cron `vercel.json` apunta a `/api/cron/poll-imap` con schedule `0 8 * * *` (diario a las 08:00 UTC).
- Las carpetas `.agents/skills/` y `.claude/skills/` son casi idénticas (mirror).

---

## 2. Agentes

### 2.1 Agentes YAML (directorio `/agents/`)

#### `agents/invoice_intake.yaml`

```yaml
name: invoice_intake
description: >
  Detecta y procesa invoices de proveedores en emails del propietario.
  Extrae montos, monedas y condiciones de pago. Crea remesa en Supabase.

model: claude-opus-4-7
max_tokens: 4096

system_prompt: |
  Eres el agente de intake de facturas para una empresa importadora de
  productos de pesca deportiva en Santiago, Chile.

  ## Personas clave
  - OWNER: gestiona proveedores, recibe invoices, instruye al gerente financiero
  - GERENTE FINANCIERO: recibe instrucción del owner, emite Orden de Pago al banco

  ## Proveedores conocidos
  - PROVEEDOR_CHINA_1 (China) — USD/CNH
  - PROVEEDOR_JAPON_1 (Japón) — JPY
  - PROVEEDOR_JAPON_2 (Japón) — JPY

  ## Datos a extraer del email/adjunto
  1. Número de invoice
  2. Nombre del proveedor
  3. Monto total y moneda (USD, JPY, CNH)
  4. Condición de pago si se menciona (30/70, 50/50, 100%, múltiples cuotas)
  5. Fecha del invoice
  6. Instrucción de pago del owner al gerente financiero
  7. Lista de ítems con SKU, descripción y cantidad si está disponible

  ## Reglas críticas
  - FX se calcula en fecha del PAGO, no del invoice — NO precalcules CLP
  - CNH es alias de CNY para efectos de FX
  - Si el invoice ya existe (por numero_invoice), ACTUALIZAR en vez de crear
  - Operaciones cuyo monto supere aprox. CLP 5.000.000 → flag requiere_aprobacion = true
  - Audit trail: registrar SIEMPRE en agent_logs

  ## Proceso paso a paso
  1. Buscar proveedor_id en tabla proveedores por nombre (ILIKE)
  2. Verificar si existe remesa con mismo numero_invoice → INSERT o UPDATE
  3. Crear registro en documentos (tipo='INVOICE')
  4. Si owner instruyó al gerente → crear alerta PAGO_PENDIENTE
  5. Si requiere_aprobacion → crear alerta adicional APROBACION_REQUERIDA
  6. Registrar en agent_logs (accion='INVOICE_PROCESADO')

  ## Formato de respuesta (siempre JSON)
  { "remesa_id":"uuid", "accion":"CREATED"|"UPDATED", "invoice_numero":"...",
    "proveedor":"...", "monto_original":0, "moneda":"USD|JPY|CNH",
    "condicion_pago":"...", "requiere_aprobacion":false, "alertas_creadas":["uuid1"] }

tools:
  - name: supabase_execute_sql
    description: Leer y escribir en Supabase PostgreSQL
  - name: get_fx_rate
    description: Obtener tipo de cambio desde CMF Chile API
    base_url: https://api.cmfchile.cl/api-sbifv3/recursos_api

triggers:
  - type: webhook
    event: email_classified
    filter:
      category: INVOICE_PROVEEDOR

environment_variables:
  - SUPABASE_URL
  - SUPABASE_KEY
  - CMF_API_KEY
```

#### `agents/customs_funds.yaml`

```yaml
name: customs_funds
description: >
  Detecta solicitudes de provisión de fondos de la agencia de aduana.
  Deduplica si llegó a múltiples destinatarios. Alerta urgente si vencimiento ≤ 3 días.

model: claude-opus-4-7
max_tokens: 2048

system_prompt: |
  # (ver contenido completo en sección 2.3 — sistema TS)

  ## Identificación del remitente
  - From: configurado en variable de entorno CUSTOMS_AGENCY_EMAIL
  - Patrón de asunto: "Ag Aduana, Cliente:[EMPRESA], solicitud de Fondos despacho:XXXXX"

  ## Reglas CRÍTICAS
  - DEDUPLICAR: clave de dedup = email_id_origen (Message-ID del email)
  - URGENTE si fecha_vencimiento ≤ 3 días → es_urgente = true
  - Vincular a remesa existente por numero_despacho si hay match

  ## Formato de respuesta
  { "provision_id":"uuid", "accion":"CREATED"|"DEDUPLICATED",
    "numero_despacho":"...", "monto_clp":0, "es_urgente":false,
    "dias_para_vencer":0, "remesa_vinculada":"uuid|null" }

tools:
  - name: supabase_execute_sql

triggers:
  - type: webhook
    event: email_classified
    filter:
      category: PROVISION_FONDOS

environment_variables:
  - SUPABASE_URL
  - SUPABASE_KEY
  - CUSTOMS_AGENCY_EMAIL
```

#### `agents/din_reconciliation.yaml`

```yaml
name: din_reconciliation
description: >
  Detecta llegada de DIN y facturas de agencia de aduana post-despacho.
  Reconcilia provisión pagada vs costo real. Actualiza remesa a RECONCILIADO.

model: claude-opus-4-7
max_tokens: 4096

system_prompt: |
  # (resumen — ver verbatim en archivos fuente)
  - DIN chileno formato: 025-2026-XXXXXXXX-D
  - Tolerancia: |diferencia| ≤ CLP 50.000 → RECONCILIADO
  - Si reconciliado → disparar evento para landed_cost agent

  ## Formato de respuesta
  { "remesa_id":"uuid", "din_numero":"025-2026-...",
    "provision_pagada_clp":0, "costo_real_clp":0, "diferencia_clp":0,
    "estado":"RECONCILIADO"|"DIFERENCIA_SIGNIFICATIVA"|"SIN_REMESA",
    "requiere_revision":false, "desglose":{...} }

tools:
  - name: supabase_execute_sql

triggers:
  - type: webhook
    event: email_classified
    filter:
      category: DIN_DESPACHO

environment_variables:
  - SUPABASE_URL
  - SUPABASE_KEY
  - CUSTOMS_AGENCY_EMAIL
```

#### `agents/landed_cost.yaml`

```yaml
name: landed_cost
description: >
  Calcula el costo real (landed cost) en CLP por SKU para cada remesa reconciliada.
  Usa FX en fecha de cada pago y distribuye costos aduaneros proporcionalmente.

model: claude-opus-4-7
max_tokens: 4096

system_prompt: |
  # Regla FX: se aplica en FECHA DEL PAGO, no del invoice
  # FX promedio ponderado = Σ(monto_i × fx_i) / Σ(monto_i)
  # Usar cantidad_recibida de stock_items, NUNCA cantidad_invoice

  ## Formato de respuesta
  { "remesa_id":"uuid", "costo_mercaderia_clp":0, "costo_aduana_clp":0,
    "costo_total_clp":0, "fx_promedio_ponderado":0,
    "items":[{ "sku":"...", "cantidad_recibida":0,
      "precio_unitario_moneda_origen":0, "costo_aduana_por_unidad_clp":0,
      "landed_cost_unitario_clp":0, "landed_cost_total_clp":0 }] }

tools:
  - name: supabase_execute_sql
  - name: get_fx_rate
    description: >
      Endpoint: https://api.cmfchile.cl/api-sbifv3/recursos_api/{moneda}/{año}/{mes}/{dia}
      Monedas: dolar, yen, euro

triggers:
  - type: event
    event: remesa_state_changed
    filter:
      new_estado: RECONCILIADO

environment_variables:
  - SUPABASE_URL
  - SUPABASE_KEY
  - CMF_API_KEY
```

### 2.2 Implementaciones TypeScript (`apps/web/lib/agents/`)

**Agente presente en YAML pero no tiene archivo TS propio:** `nota_debito` (existe en TS pero no hay `agents/nota_debito.yaml`).

| Archivo TS | Función exportada | Herramientas usadas |
|---|---|---|
| `invoice-intake.ts` | `runInvoiceIntakeAgent(input: ClassifiedEmail)` | `supabaseTool`, `fxRateTool` |
| `customs-funds.ts` | `runCustomsFundsAgent(input: ClassifiedEmail)` | `supabaseTool` |
| `din-reconciliation.ts` | `runDinReconciliationAgent(input: ClassifiedEmail)` | `supabaseTool` |
| `nota-debito.ts` | `runNotaDebitoAgent(input: ClassifiedEmail)` | `supabase_execute_sql` (inline, no comparte shared tool) |
| `landed-cost.ts` | `runLandedCostAgent(input: { remesa_id: string })` | `supabaseTool`, `fxRateTool` |

**Nota crítica:** `nota-debito.ts` no usa el `toolHandlers` compartido de `tools.ts`. Crea su propio cliente Supabase dinámicamente con `import('@supabase/supabase-js')` y no aplica la pre-flight validation (regex ALLOWED_VERBS / FORBIDDEN) que sí tienen los demás agentes.

### 2.3 runner.ts — Bucle agentico

```typescript
// apps/web/lib/agents/runner.ts
// Parámetros: agentName, systemPrompt, tools, toolHandlers, input,
//             remesaId?, maxTokens?, sessionId?
// - Usa MODELS.agent = 'claude-opus-4-7'
// - max iteraciones: 30
// - stop_reason 'end_turn': extrae JSON del texto con regex /\{[\s\S]*\}/
// - stop_reason 'tool_use': ejecuta handlers, acumula tool_results
// - Audit trail via lib/audit.ts en cada inicio y fin
```

---

## 3. Orquestación

### 3.1 `apps/web/lib/managed-agents.ts`

Este archivo es el único punto de entrada para despachar agentes desde la API.

```typescript
// Declarative registry — 5 agentes registrados

const AGENT_REGISTRY: Record<AgentName, AgentEntry> = {
  invoice_intake:     { run: runInvoiceIntakeAgent },
  customs_funds:      { run: runCustomsFundsAgent },
  din_reconciliation: {
    run: runDinReconciliationAgent,
    onSuccess: async (result) => {
      // Cadena: si estado === 'RECONCILIADO' → lanza runLandedCostAgent
    },
  },
  nota_debito: {
    run: runNotaDebitoAgent,
    onSuccess: async (result) => {
      // Cadena: si estado === 'RECONCILIADO' → lanza runLandedCostAgent
    },
  },
  landed_cost: {
    run: (input) => runLandedCostAgent(input as unknown as { remesa_id: string }),
  },
}

// Category → agent mapping
const CATEGORY_MAP: Partial<Record<EmailCategory, AgentName>> = {
  INVOICE_PROVEEDOR:  'invoice_intake',
  PROVISION_FONDOS:   'customs_funds',
  DIN_DESPACHO:       'din_reconciliation',
  NOTA_DEBITO_AGENSA: 'nota_debito',
}

// triggerAgent(agentName, input) — punto de entrada principal
```

**Flujo de cadena:**
```
email recibido (Gmail API cron / webhook)
        ↓
  gmail-extractor.ts  →  clasificador Haiku
        ↓ category
  CATEGORY_MAP → agentName
        ↓
  triggerAgent(agentName, classifiedEmail)
        ↓
  entry.run(input) → AgentRunResult
        ↓ (si completed)
  entry.onSuccess?(result)
        ↓ (si din_reconciliation o nota_debito → estado=RECONCILIADO)
  runLandedCostAgent({ remesa_id })
```

### 3.2 Webhook `/api/webhook/email`

- Valida `WEBHOOK_SECRET` con timing-safe comparison.
- Filtra por `ALLOWED_EMAIL_DOMAINS`.
- Clasifica con Claude Haiku (`MODELS.classifier = 'claude-haiku-4-5-20251001'`).
- Llama a `triggerAgent`.
- Rate limit: preset `webhook` (20 req/min).

### 3.3 Cron `/api/cron/poll-imap`

- Schedule: `0 8 * * *` (diario 08:00 UTC).
- Autenticado con `CRON_SECRET` (timing-safe).
- Rate limit: preset `webhook` con clave fija `cron-poll-imap`.
- Llama a `pollAllGmailAccounts()` de `lib/services/gmail-extractor.ts`.
- `maxDuration = 60` segundos (Vercel Edge limit).

### 3.4 Acciones manuales (API routes bajo `/api/actions/`)

| Ruta | Acción |
|---|---|
| `instruccion-pago` | Owner instruye monto a pagar; crea pagos en remesa |
| `orden-pago` | Hector emite orden de pago al banco |
| `confirmar-pago-bancario` | Confirma pago emitido con referencia SWIFT |
| `confirmar-provision` | Marca provisión como PAGADO |
| `vincular-despacho` | Vincula número de despacho a remesa |
| `archivar-expediente` | Cierra expediente completo |
| `reclamo-proveedor` | Genera reclamo por diferencia de stock |
| `resolve-alert` | Marca alerta como leída |
| `accept-stock` | Acepta conteo de bodega |
| `approve-payment` | Aprueba pago (flujo APROBACION_REQUERIDA) |
| `nota-agensa` | Registra nota de crédito/débito AGENSA |
| `pending` | Lista acciones pendientes del usuario autenticado |

---

## 4. Base de datos

### 4.1 Migraciones — tabla maestra

| Migración | Descripción |
|---|---|
| `001_initial_schema.sql` | Schema inicial: 10 tablas + RLS + indexes + trigger updated_at |
| `002_obsidian_knowledge.sql` | Tabla para RAG (knowledge base Obsidian) |
| `003_sql_executor.sql` | Función `run_sql()` v1 — wraps SQL en json_agg |
| `004_sql_security.sql` | `run_sql()` v2 — bloquea DDL, DELETE/UPDATE sin WHERE; tabla `webhook_rate_limits` |
| `005_performance_indexes.sql` | Indexes compuestos para optimización de dashboard |
| `006_nota_debito.sql` | Soporte nota débito/crédito AGENSA; campos en `provisiones_fondos` |
| `007_run_sql_hardening.sql` | `run_sql()` v3 — SECURITY INVOKER, whitelist verbos, bloquea comentarios SQL, statement_timeout 5s |
| `007_to_009_combined.sql` | Rollup idempotente de 007+008+009 (para SQL Editor manual) |
| `008_user_roles.sql` | Tabla `user_roles` — RBAC en DB (roles: owner/finance/warehouse/agent) |
| `009_rls_completion.sql` | Habilita RLS en todas las tablas; policy SELECT para authenticated |
| `010_gmail_accounts.sql` | Tablas `gmail_accounts` y `oauth_nonces` — OAuth tokens en DB |
| `011_nota_credito_agensa.sql` | Comentarios/documentación de tipo NOTA_CREDITO; index documentos |
| `012_reglas_table.sql` | Tabla `reglas` — motor de reglas de automatización (JSONB) |
| `013_google_document_ai_id.sql` | Columnas Google Document AI en `documentos` |

### 4.2 Schema de tablas (001_initial_schema.sql)

```sql
-- PROVEEDORES
create table proveedores (
  id              uuid primary key default uuid_generate_v4(),
  nombre          text not null,
  pais            text not null,
  moneda          text not null,   -- USD | JPY | CNH
  contacto_nombre text,
  contacto_email  text,
  created_at      timestamptz default now()
);

-- REMESAS (una por invoice de proveedor)
create table remesas (
  id               uuid primary key default uuid_generate_v4(),
  proveedor_id     uuid references proveedores(id),
  numero_invoice   text not null,
  estado           text not null default 'INVOICE_RECIBIDO',
  -- INVOICE_RECIBIDO → PAGO_PENDIENTE → PAGO_PARCIAL → PAGO_COMPLETO
  -- → EN_ADUANA → PROVISION_RECIBIDA → MERCADERIA_RECIBIDA → RECONCILIADO
  moneda_origen    text not null,   -- USD | JPY | CNH
  monto_original   numeric(15,4) not null,
  monto_total_usd  numeric(15,4),
  monto_total_jpy  numeric(15,0),
  condicion_pago   text,            -- '30/70' | '50/50' | '100%' | ...
  numero_despacho  text,
  din_numero       text,
  fecha_invoice    date,
  notas            text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- PAGOS (uno o más por remesa)
create table pagos (
  id                   uuid primary key default uuid_generate_v4(),
  remesa_id            uuid references remesas(id) not null,
  tipo                 text not null,   -- ANTICIPO | SALDO | UNICO
  monto_moneda_origen  numeric(15,4) not null,
  moneda               text not null,
  monto_clp            numeric(15,0),
  fx_rate              numeric(15,6),   -- FX en fecha de PAGO
  fx_fecha             date,
  estado               text not null default 'PENDIENTE',  -- PENDIENTE | EMITIDO | CONFIRMADO
  orden_pago_numero    text,
  fecha_emision        date,
  fecha_confirmacion   date,
  created_by           text,
  created_at           timestamptz default now()
);

-- PROVISIONES_FONDOS (de AGENSA)
create table provisiones_fondos (
  id               uuid primary key default uuid_generate_v4(),
  remesa_id        uuid references remesas(id),
  numero_despacho  text not null,
  monto_clp        numeric(15,0) not null,
  fecha_vencimiento date,
  es_urgente       boolean default false,
  estado           text not null default 'PENDIENTE',  -- PENDIENTE | PAGADO
  email_id_origen  text,                    -- clave de dedup
  recibido_por     text[] default '{}',     -- ['sebastian','hector']
  created_at       timestamptz default now(),
  paid_at          timestamptz,
  -- Añadidos en 006:
  nota_debito_numero  text,
  monto_devolucion_clp numeric(15,0),
  nota_debito_fecha    date
);

-- STOCK_RECEPCIONES
create table stock_recepciones (
  id               uuid primary key default uuid_generate_v4(),
  remesa_id        uuid references remesas(id) not null,
  fecha_recepcion  date not null,
  estado           text not null default 'PENDIENTE',
  -- PENDIENTE | CONTADO | INGRESADO_BSALE | CON_DIFERENCIAS
  ingresado_bsale_at timestamptz,
  created_at       timestamptz default now()
);

-- STOCK_ITEMS (por SKU)
create table stock_items (
  id                  uuid primary key default uuid_generate_v4(),
  recepcion_id        uuid references stock_recepciones(id) not null,
  remesa_id           uuid references remesas(id) not null,
  sku                 text not null,
  descripcion         text,
  cantidad_invoice    integer not null,
  cantidad_recibida   integer,
  diferencia          integer generated always as (cantidad_recibida - cantidad_invoice) stored,
  bsale_product_id    text,
  precio_unitario_usd numeric(10,4),
  created_at          timestamptz default now()
);

-- DOCUMENTOS
create table documentos (
  id               uuid primary key default uuid_generate_v4(),
  remesa_id        uuid references remesas(id),
  tipo             text not null,
  -- INVOICE | DIN | FACTURA_AGENSA | PROVISION | NOTA_DEBITO | NOTA_CREDITO | OTRO
  numero           text,
  archivo_nombre   text,
  archivo_url      text,            -- Supabase Storage URL
  monto            numeric(15,4),
  moneda           text,
  fecha            date,
  email_id_origen  text,
  -- Añadidos en 013:
  google_document_ai_id              text,
  google_document_ai_revision_id     text,
  google_document_ai_processor       text,
  google_document_ai_gcs_uri         text,
  created_at       timestamptz default now()
);

-- ALERTAS
create table alertas (
  id           uuid primary key default uuid_generate_v4(),
  remesa_id    uuid references remesas(id),
  tipo         text not null,
  -- PROVISION_URGENTE | PAGO_PENDIENTE | DIFERENCIA_STOCK |
  -- APROBACION_REQUERIDA | SALDO_FAVOR_AGENSA
  mensaje      text not null,
  urgente      boolean default false,
  leida        boolean default false,
  destinatario text,    -- 'sebastian' | 'hector' | 'ambos'
  created_at   timestamptz default now(),
  leida_at     timestamptz
);

-- AGENT_LOGS (audit trail inmutable)
create table agent_logs (
  id            uuid primary key default uuid_generate_v4(),
  agent_name    text not null,
  session_id    text,
  remesa_id     uuid references remesas(id),
  accion        text not null,
  payload       jsonb,
  resultado     text,   -- SUCCESS | ERROR | PENDING_APPROVAL
  error_mensaje text,
  created_at    timestamptz default now()
);

-- FX_RATES (cache CMF Chile)
create table fx_rates (
  id        uuid primary key default uuid_generate_v4(),
  moneda    text not null,   -- USD | JPY | EUR | CNH
  fecha     date not null,
  tasa_clp  numeric(15,6) not null,
  fuente    text default 'CMF',
  created_at timestamptz default now(),
  unique(moneda, fecha)
);
```

### 4.3 Tablas adicionales (migraciones 002–013)

```sql
-- obsidian_knowledge (002)
create table obsidian_knowledge (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  file_path text not null unique,
  content text not null,
  last_modified timestamptz not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- webhook_rate_limits (004)
CREATE TABLE IF NOT EXISTS webhook_rate_limits (
  ip          text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT NOW(),
  call_count  integer NOT NULL DEFAULT 1,
  PRIMARY KEY (ip, window_start)
);

-- user_roles (008)
CREATE TABLE IF NOT EXISTS user_roles (
  user_id    uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text        NOT NULL,
  role       text        NOT NULL CHECK (role IN ('owner', 'finance', 'warehouse', 'agent')),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- gmail_accounts (010)
CREATE TABLE IF NOT EXISTS gmail_accounts (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_label text        NOT NULL UNIQUE,
  email         text,
  refresh_token text        NOT NULL,
  connected_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- oauth_nonces (010)
CREATE TABLE IF NOT EXISTS oauth_nonces (
  nonce      text        PRIMARY KEY,
  user_id    uuid        NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- reglas (012) — motor de automatización
CREATE TABLE IF NOT EXISTS public.reglas (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre            text        NOT NULL,
  descripcion       text,
  activa            boolean     NOT NULL DEFAULT true,
  condiciones       jsonb       NOT NULL DEFAULT '[]',
  accion            jsonb       NOT NULL DEFAULT '{}',
  veces_ejecutada   integer     NOT NULL DEFAULT 0,
  ultima_ejecucion  timestamptz,
  creado_por        text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
```

### 4.4 Función `run_sql()` — versión final (007)

```sql
CREATE OR REPLACE FUNCTION run_sql(sql_text text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER          -- no DEFINER: corre con privilegios del caller
SET search_path = public
AS $$
-- Whitelist: solo SELECT/INSERT/UPDATE/DELETE/WITH
-- Bloquea: comentarios SQL, multi-statement, DDL, sys functions, catálogos
-- statement_timeout local: 5000ms
-- Errores genéricos al LLM (no leak de SQLERRM/SQLSTATE)
$$;
GRANT EXECUTE ON FUNCTION run_sql TO service_role;
REVOKE EXECUTE ON FUNCTION run_sql FROM PUBLIC, anon, authenticated;
```

### 4.5 Row Level Security

| Tabla | RLS | Policies |
|---|---|---|
| Todas las tablas core (10 iniciales + obsidian) | Habilitado | `service_all` (for all, using true) + `{tabla}_authenticated_read` (SELECT to authenticated) — desde 009 |
| `user_roles` | Habilitado | `service_role` full; authenticated SELECT own row; owner manages all |
| `gmail_accounts`, `oauth_nonces` | Habilitado | Solo `service_role` full (010) |
| `reglas` | Habilitado | `auth_all_reglas` — authenticated full (012) ← **ADVERTENCIA** |
| `webhook_rate_limits` | Habilitado (009) | Sin policy explícita → solo service_role |

**Advertencia RLS:** La tabla `reglas` tiene `FOR ALL TO authenticated USING (true) WITH CHECK (true)`, lo que permite a cualquier usuario autenticado crear/modificar/borrar reglas de automatización.

### 4.6 Seed de desarrollo (`supabase/seed.dev.sql`)

```sql
-- [DATO_REAL: nombre_proveedor_china] — AMIGOS COMPANY LIMITED
-- [DATO_REAL: email_proveedor_china]  — [REDACTADO]
-- [DATO_REAL: nombre_proveedor_japon1] — MEIHO CHEMICAL INDUSTRY
-- [DATO_REAL: nombre_proveedor_japon2] — VARIVAS CO., LTD.
```

El seed contiene nombres reales de proveedores y un email real de contacto. Aunque está marcado como "NOT for production", estos datos son reales y están commiteados en el repo.

### 4.7 Datos reales en `001_initial_schema.sql`

```sql
-- Comentario en línea 4: MI TIENDA SPA · RUT [DATO_REAL: RUT_empresa]
```

El RUT real de la empresa aparece en el comentario del header de la migración 001.

---

## 5. Documentación existente

### 5.1 Archivos .md en el repo (excluyendo node_modules)

```
README.md
CLAUDE.example.md
.claude/commands/check-remesa.md
.claude/commands/cybersecurity.md
.claude/commands/deploy.md
.claude/commands/new-agent.md
.claude/commands/new-route.md
.claude/commands/security-scan.md
.claude/skills/caveman/SKILL.md
.claude/skills/diagnose/SKILL.md
.claude/skills/grill-me/SKILL.md
.claude/skills/grill-with-docs/ADR-FORMAT.md
.claude/skills/grill-with-docs/CONTEXT-FORMAT.md
.claude/skills/grill-with-docs/SKILL.md
.claude/skills/improve-codebase-architecture/DEEPENING.md
.claude/skills/improve-codebase-architecture/INTERFACE-DESIGN.md
.claude/skills/improve-codebase-architecture/LANGUAGE.md
.claude/skills/improve-codebase-architecture/SKILL.md
.claude/skills/setup-matt-pocock-skills/ (5 archivos)
.claude/skills/tdd/ (6 archivos)
.claude/skills/to-issues/SKILL.md
.claude/skills/to-prd/SKILL.md
.claude/skills/triage/ (3 archivos)
.claude/skills/write-a-skill/SKILL.md
.claude/skills/zoom-out/SKILL.md
.agents/skills/ (mirror de .claude/skills/, sin zoom-out)
```

### 5.2 CLAUDE.md

**No existe** en el repo. Existe `CLAUDE.example.md` (plantilla genérica para otras empresas). El `CLAUDE.md` real (con datos de Bluefishing) está en `.gitignore` y vive fuera del árbol del repo.

### 5.3 README.md — resumen

- Describe el problema y solución: 5 etapas del flujo de importación.
- Stack: Next.js 15, Claude Opus 4.7, Supabase, Vercel, Gmail API, CMF Chile.
- Cost estimation: ~$7 USD/month.
- Quick start con comandos.
- Referencia a `SETUP.md` — **este archivo no existe en el repo**.
- Commit message visible en el README: `git clone https://github.com/Cristob777/Bluefishing_remesas`.

### 5.4 CLAUDE.example.md

Plantilla pública con campos genéricos (YOUR_COMPANY_NAME, OWNER, FINANCE MANAGER, etc.). No contiene datos reales. Diseñado para que terceros adapten el sistema.

### 5.5 Ausencias documentales

- No existe `SETUP.md` (referenciado en README).
- No existe `ARCHITECTURE.md` ni ADRs.
- No existe `CONTEXT.md`.
- No existe documentación de la API (OpenAPI/Swagger).

---

## 6. Configuración y secretos

### 6.1 Variables de entorno (`.env.example` verbatim — sin valores)

**Supabase:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**Anthropic:**
- `ANTHROPIC_API_KEY`

**App URL:**
- `NEXTAUTH_URL`

**Secrets:**
- `WEBHOOK_SECRET`
- `CRON_SECRET`

**Gmail — Ops Inbox:**
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GMAIL_REFRESH_TOKEN_OPS`
- `GMAIL_EMAIL_OPS`

**Gmail — Cuentas adicionales:**
- `GMAIL_REFRESH_TOKEN_ACCOUNT_1`
- `GMAIL_EMAIL_ACCOUNT_1`
- `GMAIL_LABEL_ACCOUNT_1`

**Gmail — Legacy named slots:**
- `GMAIL_REFRESH_TOKEN_SEBASTIAN`
- `GMAIL_REFRESH_TOKEN_HECTOR`

**Email security:**
- `ALLOWED_EMAIL_DOMAINS`

**Datos operacionales:**
- `COMPANY_NAME`
- `COMPANY_DISPLAY`
- `OWNER_EMAILS`
- `FINANCE_EMAILS`
- `OWNER_NAME`
- `FINANCE_NAME`
- `CUSTOMS_AGENCY_EMAIL`
- `CUSTOMS_AGENCY_NAME`
- `SUPPLIER_NAMES`
- `SUPPLIER_EMAIL_1`
- `SUPPLIER_EMAIL_2`
- `SUPPLIER_EMAIL_3`

**FX / ERP:**
- `CMF_API_KEY`
- `BSALE_TOKEN`

**IMAP (alternativo, no recomendado):**
- `IMAP_HOST`
- `IMAP_PORT`
- `IMAP_USER_ACCOUNT_1`
- `IMAP_PASS_ACCOUNT_1`

### 6.2 Variables adicionales referenciadas en código (no en .env.example)

Detectadas mediante grep en `.ts` / `.tsx`:

- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — alias nuevo Supabase (fallback a ANON_KEY)
- `NEXT_PUBLIC_APP_URL` — usado en `lib/auth.ts`
- `NODE_ENV` — varios archivos
- `NEXT_PUBLIC_OWNER_DISPLAY` — componentes UI
- `NEXT_PUBLIC_COMPANY_DISPLAY` — dashboard overview
- `SUPPLIER_CHINA_NAME` — `lib/agents/invoice-intake.ts`
- `SUPPLIER_CHINA_EMAIL` — idem
- `SUPPLIER_JAPAN1_NAME` — idem
- `SUPPLIER_JAPAN2_NAME` — idem
- `CUSTOMS_AGENCY_RUT` — `lib/agents/customs-funds.ts`
- `CUSTOMS_AGENCY_BANK_ACCOUNTS` — idem y `api/actions/pending`
- `FINANCE_EMAIL` — `lib/agents/customs-funds.ts`
- `VERCEL_URL` — `lib/services/gmail-extractor.ts`, `proxy.ts`

### 6.3 `apps/web/next.config.js`

```javascript
const nextConfig = {
  serverExternalPackages: ['@anthropic-ai/sdk'],
}
module.exports = nextConfig
```

### 6.4 `apps/web/vercel.json`

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "crons": [
    {
      "path": "/api/cron/poll-imap",
      "schedule": "0 8 * * *"
    }
  ]
}
```

### 6.5 `proxy.ts` (middleware Next.js — primeras 60 líneas)

```typescript
// Allowed origins hardcodeados:
const ALLOWED_ORIGINS = new Set([
  'https://bluefishing-agents.vercel.app',
  'https://bluefishingremesasv01-otct8i4i1-cristob777s-projects.vercel.app',
  ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : []),
])

// Security headers incluidos:
// X-Content-Type-Options, X-Frame-Options: DENY, X-XSS-Protection: 0
// Referrer-Policy, Permissions-Policy, HSTS (max-age=63072000)
// Content-Security-Policy con nonce
// connect-src incluye: *.supabase.co, api.cmfchile.cl
```

**Advertencia:** Las URLs de Vercel están hardcodeadas en el middleware. Si se cambia el proyecto de Vercel, hay que actualizar `proxy.ts`.

### 6.6 `.claude/settings.json`

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run dev)", "Bash(npm run build)", "Bash(npm run lint)",
      "Bash(npm run type-check)", "Bash(npm install*)",
      "Bash(git status)", "Bash(git diff*)", "Bash(git log*)",
      "Bash(git add*)", "Bash(git commit*)",
      "Bash(npx supabase*)",
      "Bash(curl -X POST https://bluefishing-agents.vercel.app/api/webhook/email*)"
    ],
    "deny": []
  },
  "enabledMcpjsonServers": ["supabase"]
}
```

---

## 7. Tests y CI

### 7.1 Tests del proyecto

**No existen archivos de test propios del proyecto.** Los únicos `.test.ts` / `.spec.ts` encontrados pertenecen exclusivamente a `node_modules` (dependencias como `zod`, `pino`, `@supabase/ssr`).

- No existe `vitest.config.*`
- No existe `jest.config.*`
- No existe directorio `__tests__/`
- El script `package.json` no incluye `"test"` ni `"test:*"`

### 7.2 CI/CD

- No existe directorio `.github/workflows/`
- No hay pipeline de CI (GitHub Actions, CircleCI, etc.)
- El deploy es directo: `git push origin main` → auto-deploy en Vercel (conectado vía GitHub)
- No hay checks automáticos antes del merge

### 7.3 Herramientas de calidad de código

- `npm run lint` — Next.js ESLint
- `npm run type-check` — TypeScript `tsc --noEmit`
- Ambos scripts existen pero no están integrados en ningún pipeline CI

---

## 8. Deuda técnica detectada

### 8.1 Seguridad

**CRÍTICO — Datos reales en el repositorio:**
- `supabase/migrations/001_initial_schema.sql` línea 4: contiene el RUT real de la empresa [DATO_REAL: RUT_empresa].
- `supabase/seed.dev.sql`: contiene nombres reales de proveedores y [DATO_REAL: email_proveedor_china] de un proveedor.
- `proxy.ts`: URL de deployment de Vercel hardcodeada con parte del nombre del dueño (`cristob777s-projects`).

**ALTO — `nota-debito.ts` no usa SQL sandbox compartido:**
El agente `nota-debito.ts` crea su propio cliente Supabase inline y no aplica la pre-flight validation (`ALLOWED_VERBS`, `FORBIDDEN` regex) que sí tienen los demás agentes a través de `lib/agents/tools.ts`. Esto rompe la defensa en profundidad para ese agente.

**ALTO — Policy RLS de `reglas` demasiado permisiva:**
`CREATE POLICY "auth_all_reglas" ON public.reglas FOR ALL TO authenticated USING (true)` — cualquier usuario autenticado puede crear, modificar o borrar reglas de automatización, incluyendo usuarios con rol `warehouse`.

**MEDIO — URLs hardcodeadas en middleware:**
`proxy.ts` tiene dos URLs de Vercel hardcodeadas. Si el proyecto cambia de cuenta/nombre en Vercel, el middleware dejará de funcionar para CORS.

**BAJO — `gmail_accounts.refresh_token` almacenado en texto plano:**
Los tokens OAuth de Gmail se guardan en la columna `refresh_token text NOT NULL` sin cifrado a nivel de columna. La seguridad descansa enteramente en que solo `service_role` tiene acceso (RLS). Un leak del `SUPABASE_SERVICE_ROLE_KEY` expone todos los tokens de Gmail.

### 8.2 Arquitectura

**SETUP.md no existe:**
El `README.md` hace referencia a `SETUP.md` en múltiples lugares pero este archivo no está en el repositorio.

**5 agentes en código TS vs 4 en YAML:**
Existe un agente `nota_debito` implementado en TypeScript (`apps/web/lib/agents/nota-debito.ts`) y referenciado en `managed-agents.ts`, pero no tiene archivo YAML correspondiente en `/agents/`. Los 4 YAML son para invoice_intake, customs_funds, din_reconciliation, landed_cost.

**`obsidian_knowledge` sin uso visible:**
La tabla `obsidian_knowledge` (migración 002) tiene schema completo con RLS pero no hay ningún código de sync ni de consulta visible en el repositorio actual. Parece ser un remanente de una funcionalidad RAG que no fue completada o fue removida.

**`webhook_rate_limits` (tabla de DB) vs `rateLimit.ts` (in-memory):**
Hay dos mecanismos de rate limiting que no están integrados entre sí: la tabla `webhook_rate_limits` creada en migración 004 y el módulo `lib/rateLimit.ts` con store in-memory. El módulo TS tiene un comentario explícito: "In-memory store — resets on cold start. For persistent limits at scale, swap to Upstash Redis." La tabla DB no es usada por el código TS.

**`INSTRUCCION_PAGO` category sin agente:**
`types/index.ts` define `EmailCategory` que incluye `INSTRUCCION_PAGO`, pero no hay entrada en `CATEGORY_MAP` en `managed-agents.ts` para esta categoría (caería en `null` y no dispararía ningún agente).

**Encadenamiento de agentes frágil:**
La cadena `din_reconciliation → landed_cost` depende de que el JSON resultado del agente tenga exactamente el campo `estado`. El código usa duck-typing (`'estado' in (res as object)`) y aborta silenciosamente con `CHAIN_ABORTED` si no está presente. No hay retry ni alerta visible al usuario.

### 8.3 Calidad de código

**Sin tests de ningún tipo:**
No hay tests unitarios, de integración ni end-to-end. Todo el flujo financiero (FX, landed cost, reconciliación) corre sin cobertura de tests.

**Sin CI pipeline:**
Los cambios se despliegan directamente a producción via `git push origin main` sin ningún check automático (lint, type-check, tests).

**`nota-debito.ts` crea cliente Supabase con import dinámico:**
```typescript
const { createClient } = await import('@supabase/supabase-js')
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)
```
Esto bypasea el singleton `db` de `lib/supabase.ts` y no aprovecha la validación centralizada de tools.

**Modelo hardcodeado en `lib/ai.ts`:**
```typescript
export const MODELS = {
  classifier: 'claude-haiku-4-5-20251001',
  agent:      'claude-opus-4-7',
} as const
```
El nombre de modelo está hardcodeado. Actualizar a una nueva versión del modelo requiere editar código, no solo configuración.

**`package.json` sin script `"test"`:**
No hay forma estándar de ejecutar tests; `npm test` fallará.

### 8.4 Observabilidad

**Sin métricas ni alerting externo:**
No hay integración con Sentry, Datadog, o similar. Los errores se logean con `console.error` y se registran en `agent_logs`, pero no hay alerting proactivo para errores de agentes.

**`maxDuration = 60` en cron puede ser insuficiente:**
Si hay muchos emails no procesados acumulados, `pollAllGmailAccounts()` puede exceder el límite de 60 segundos de Vercel.

---

*Fin del reporte. Archivos clave auditados: 50+ archivos fuente, 13 migraciones SQL, 4 archivos YAML de agentes.*
