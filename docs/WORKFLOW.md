# WORKFLOW.md — Documento Sagrado

> Fuente de verdad del pipeline de remesas de importación de **Bluefishing.cl
> (MI TIENDA SPA)**. Todo —tipos, tests, prompts, invariantes— deriva de este
> documento. Si el código contradice este archivo, se discute; si la operación
> real lo contradice, este archivo se actualiza **primero**, luego el código.
>
> **Versión:** 2.0 — corregida contra `REPO_REPORT.md` (2026-05-30). Reemplaza
> la 1.0, que asumía 5 agentes en fila y "todo manual". La realidad es distinta.

---

## 0. Principios

1. **Humano en cada decisión con consecuencia.** Los agentes *preparan*
   (extraen, calculan, crean alertas). Un humano *decide* (aprueba pago, emite
   orden, confirma provisión, acepta stock, cierra expediente) vía
   `/api/actions/`. El humano es el responsable (DRI); el agente hace el trabajo.
2. **Dos capas, no una.** La **ingesta/extracción** se automatiza (correo ->
   dato). La **decisión** es manual. Lo automático nunca ejecuta algo
   irreversible.
3. **Cada etapa produce un artefacto** legible para el sistema (queryability).
4. **Cada etapa que estima cierra el loop** comparando estimado vs. real.
5. **Todo lo que importa entra al audit hash-chain** tamper-evident.
   -> Hoy `agent_logs` es append plano, NO hash-chain. Pendiente (blocker #10).

---

## 1. Actores

| Actor | Rol | DRI de... |
|-------|-----|---------|
| **Sebastian (OWNER)** | Dueno / proveedores | Invoice, instruccion de pago, discrepancias de stock con proveedor |
| **Hector (FINANCE)** | Finanzas / ops | Orden de pago, provision, conteo/Bsale, cierre |
| **AGENSA** | Agente de aduana (externo) | Provision, DIN, factura post-despacho, nota de debito |
| **Banco** | Externo | Ejecuta pago internacional (SWIFT) |
| **Bsale** | ERP (externo) | Inventario, costo unitario. INTEGRACION NO IMPLEMENTADA (blocker #6) |
| **Agentes** | IA (asistencia) | Preparan etapas para aprobacion humana |

Origenes: Japon (JPY), USA (USD), China (CNY/CNH), Europa (EUR).

---

## 2. Arquitectura real (no son 5 agentes en fila)

```
                    +-------------------------------------+
   CORREO ---------> |  INGESTA (3 capas)  [A REHACER]     |
                    |  filtro Gmail -> router -> extractor |
                    +--------------+----------------------+
                                   | correo clasificado + datos
        +--------------------------+--------------------------+
        v                          v                          v
+---------------+        +---------------+         +---------------------+
| invoice_intake|        | customs_funds |         | din_reconciliation  |
|  (Etapa 1)    |        |  (Etapa 3)    |         |   (Etapa 5)         |
+------+--------+        +------+--------+         +---------+-----------+
       | crea remesa            | crea provision             | si RECONCILIADO
       | + alertas              | + alerta urgente           v
       |                        |                  +------------------+
       |                        |                  |  nota_debito     | (si excedente)
       |                        |                  +--------+---------+
       |                        |                           v
       |                        |                  +------------------+
       |                        |                  |  landed_cost     | (costo final)
       |                        |                  +------------------+
       v                        v                           v
   ================================================================
      CAPA DE DECISION HUMANA  --  /api/actions/  (lo que decide)
     instruccion-pago . approve-payment . orden-pago .
     confirmar-pago-bancario . confirmar-provision .
     vincular-despacho . accept-stock . reclamo-proveedor .
     nota-agensa . archivar-expediente
   ================================================================
```

- **3 agentes de ingesta:** `invoice_intake`, `customs_funds`, `din_reconciliation`.
- **2 agentes derivados** (encadenados tras DIN reconciliado): `nota_debito`, `landed_cost`.
- **Etapas 2 y 4 NO tienen agente** — son enteramente acciones manuales.
- **INSTRUCCION_PAGO = sin agente IA**: cuando Sebastian envía instrucción de
  pago a Hector por email, el sistema SOLO registra la alerta y notifica.
  Etapa 2 es deliberadamente manual: Hector decide y emite la orden.

---

## 3. Maquina de estados (tabla `remesas`)

```
INVOICE_RECIBIDO -> PAGO_PENDIENTE -> PAGO_PARCIAL -> PAGO_COMPLETO
   -> EN_ADUANA -> PROVISION_RECIBIDA -> MERCADERIA_RECIBIDA -> RECONCILIADO
```

---

## 4. Etapas en detalle

### Etapa 1 — Invoice del proveedor
- **Trigger:** correo de proveedor conocido (via ingesta).
- **Agente `invoice_intake`:** extrae proveedor, invoice, monto, moneda,
  condicion de pago (30/70, 50/50, 100%, cuotas), items con SKU. Crea/actualiza
  remesa (dedup por `numero_invoice`). Crea alerta `PAGO_PENDIENTE`. Si monto
  >~ CLP 5.000.000 -> alerta `APROBACION_REQUERIDA`. **No precalcula CLP** (FX es
  en fecha de pago).
- **Decision humana:** Seba instruye monto (`instruccion-pago`); si aplica,
  `approve-payment`.
- **Artefacto:** remesa + documento INVOICE + alertas.
- **Estado:** `INVOICE_RECIBIDO` -> `PAGO_PENDIENTE`.

### Etapa 2 — Orden de pago al banco  (SIN agente — 100% manual)
- **Trigger:** Hector recibe la instruccion.
- **Email INSTRUCCION_PAGO:** cuando Sebastian envía instrucción por email,
  el sistema crea una alerta `PAGO_PENDIENTE` urgente para Hector. NO invoca
  ningún agente IA. La etapa es deliberadamente manual.
- **Accion humana:** `orden-pago` (emite orden internacional escalonada, tramos
  variables) -> `confirmar-pago-bancario` (registra referencia SWIFT). Cada pago
  guarda `fx_rate` + `fx_fecha` **en fecha de pago**.
- **Artefacto:** registros en `pagos` (tipo ANTICIPO/SALDO/UNICO) con FX por tramo.
- **Estado:** `PAGO_PENDIENTE` -> `PAGO_PARCIAL` -> `PAGO_COMPLETO`.

### Etapa 3 — Provision de fondos AGENSA
- **Trigger:** correo urgente de AGENSA (patron de asunto fijo). Puede llegar a
  Seba **y** Hector -> **deduplicar por `email_id_origen`** (Message-ID).
- **Agente `customs_funds`:** dedup, extrae monto y vencimiento, vincula a remesa
  por `numero_despacho`. Si vencimiento <= 3 dias -> `es_urgente=true` + alerta
  `PROVISION_URGENTE`. Calcula **landed cost ESTIMADO**.
- **Decision humana:** `confirmar-provision` (marca PAGADO); `vincular-despacho`.
- **Artefacto:** registro en `provisiones_fondos` + landed cost estimado.
- **Estado:** `EN_ADUANA` -> `PROVISION_RECIBIDA`.

### Etapa 4 — Conteo fisico e ingreso a Bsale  (SIN agente — manual)
- **Trigger:** llega la mercaderia (evento fisico).
- **Accion humana:** Hector cuenta e ingresa cantidades **reales recibidas**.
  `accept-stock` (acepta conteo). Discrepancias -> `reclamo-proveedor`.
- **Artefacto:** `stock_recepciones` + `stock_items` (con `cantidad_recibida`,
  `diferencia` calculada). INGRESO A BSALE AUN NO INTEGRADO (blocker #6).
- **Estado:** `MERCADERIA_RECIBIDA` (o `CON_DIFERENCIAS`).

### Etapa 5 — DIN, regularizacion y cierre
- **Trigger:** AGENSA envia DIN (`025-2026-XXXXXXXX-D`) + factura post-despacho.
- **Agente `din_reconciliation`:** reconcilia provision pagada vs. costo real.
  Tolerancia `|diff| <= CLP 50.000` -> `RECONCILIADO`; si no ->
  `DIFERENCIA_SIGNIFICATIVA`.
- **Cadena automatica si `RECONCILIADO`:**
  - **`nota_debito`** (si hubo excedente): registra nota de debito AGENSA.
  - **`landed_cost`:** costo FINAL por SKU, FX ponderado en fecha de pago,
    usa `cantidad_recibida` (nunca `cantidad_invoice`).
    **IVA import NO entra al costo** — va al F29, no al landed cost unitario.
- **Estado:** `RECONCILIADO`.

---

## 5. Invariantes del flujo financiero

1. **FX en fecha de pago, nunca del invoice.**
2. **Promedio FX ponderado por monto** cuando hay múltiples tramos de pago.
3. **IVA importación NUNCA entra al landed cost** — se registra separado para F29.
4. **Se usa `cantidad_recibida`, nunca `cantidad_invoice`** en landed cost.
5. **Excedente de provisión nunca baja el landed cost** — se registra como
   nota de débito AGENSA separada.
6. **Tolerancia reconciliación:** `|provision - costo_real| <= CLP 50.000` -> RECONCILIADO.
7. **Audit trail obligatorio** en cada operación de agente.

---

## 6. Deuda que este workflow asume y que hay que cerrar

| Pieza del workflow | Estado real | Blocker |
|---|---|---|
| Ingesta confiable | cron+clasificador a rehacer (funnel) | — |
| Ingreso a Bsale (etapa 4) | env var sin codigo | #6 |
| Audit hash-chain (5.6) | `agent_logs` append plano | #10 |
| Queue + retry cadena (etapa 5) | implementado (1 retry), mejorar a 3 | #9 |
| `nota_debito` sandbox SQL | RESUELTO — usa toolHandlers compartido | ✓ |
| Categoria `INSTRUCCION_PAGO` | RESUELTO — alerta urgente sin agente | ✓ |
| Tests del flujo financiero | En progreso | #7 |
