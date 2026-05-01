---
description: Inspect the full state of a remesa across all related tables
---

The user will provide a remesa identifier — either a UUID, an invoice number (e.g. `AMIGOS-2026-004`), or a despacho number (e.g. `DSP-26-1234`).

Query the Supabase database to show the complete state of that remesa:

1. **Remesa base** — `id`, `numero_invoice`, `estado`, `moneda_origen`, `monto_original`, `condicion_pago`, `numero_despacho`, `created_at`, `updated_at`

2. **Proveedor** — nombre, país, moneda

3. **Pagos** — list all with: `tipo`, `estado`, `monto_moneda_origen`, `moneda`, `orden_pago_numero`, `fecha_emision`, `fecha_confirmacion`, `fx_fecha`

4. **Provisiones de fondos** — list all with: `monto_clp`, `estado`, `fecha_vencimiento`, `paid_at`, `es_urgente`, `recibido_por`

5. **Stock recepciones** — list all with: `estado`, `fecha_recepcion`, and for each item: `sku`, `descripcion`, `cantidad_invoice`, `cantidad_recibida`, `diferencia`

6. **Documentos** — list all: `tipo`, `numero`, `fecha`

7. **Alertas** — list open (leida=false): `tipo`, `mensaje`, `urgente`, `destinatario`, `created_at`

8. **Agent logs** — last 10 entries: `agent_name`, `accion`, `resultado`, `created_at`

Display results in a clear structured format. Highlight:
- Any alerta urgente
- Any stock diferencia ≠ 0
- Pending pagos or provisiones
- Current estado in the pipeline: INVOICE_RECIBIDO → PAGO_PENDIENTE → PAGO_COMPLETO → EN_ADUANA → RECIBIDO → RECONCILIADO

Use the Supabase MCP tool if available, otherwise instruct the user to run the query in the Supabase dashboard.
