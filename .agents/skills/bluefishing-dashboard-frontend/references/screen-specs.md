# Screen Specs

## Overview

Purpose: tell the operator what needs attention today.

Required areas:

- Top metrics: pending actions, active remesas, urgent provisions, stock differences.
- Gmail/agent error banner when integration is broken.
- Latest agent activity with deduped repeated logs.
- Critical alerts.
- Recently processed documents.

Design notes:

- Use dense bands and compact cards.
- Avoid giant hero copy.
- Primary CTA should take the user to `Acciones`.

## Remesas

Purpose: manage expediente status and drill into a remesa.

Required areas:

- Search and filters.
- Sticky table.
- Status badge.
- Pipeline progress.
- Invoice, supplier, amount, dispatch, DIN.
- Detail drawer with timeline, amounts, payments, documents, reconciliation and logs.

Important states:

- `INVOICE_RECIBIDO`
- `PAGO_PENDIENTE`
- `PAGO_PARCIAL`
- `PAGO_COMPLETO`
- `EN_ADUANA`
- `PROVISION_RECIBIDA`
- `MERCADERIA_RECIBIDA`
- `SALDO_FAVOR`
- `RECONCILIADO`

## Actions

Purpose: complete human-in-the-loop decisions.

Required action types:

- `INSTRUCCION_PAGO`
- `VINCULAR_DESPACHO`
- `EMITIR_ORDEN_PAGO`
- `CONFIRMAR_PAGO_BANCARIO`
- `CONFIRMAR_PROVISION`
- `INGRESAR_STOCK`
- `RECLAMO_PROVEEDOR`
- `APROBAR_OPERACION`
- `REGISTRAR_NOTA_AGENSA`
- `ARCHIVAR_EXPEDIENTE`

Every action form needs:

- Evidence summary.
- Exact required fields.
- Disabled submit until valid.
- Specific completion label.
- Error display.

## Agents

Purpose: prove AI is accountable.

Required areas:

- Cards for invoice intake, customs funds, DIN reconciliation, nota AGENSA, landed cost.
- Live log.
- Reasoning panel.
- Error states.
- Confidence/source/rule when available.

## Stock

Purpose: receive goods and resolve differences.

Required areas:

- Pending receptions.
- Count form per SKU.
- Difference summary.
- Claim CTA.
- Status after count.
