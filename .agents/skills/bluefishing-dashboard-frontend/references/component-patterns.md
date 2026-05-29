# Component Patterns

Prefer these reusable patterns.

## Page Header

Use:

- Eyebrow: module category.
- H1: screen name.
- Subtitle: one operational sentence.
- Right actions: refresh, command menu, primary action.

Avoid:

- Hero sections inside dashboard screens.
- Long descriptive copy.

## Metric Strip

Use for 3-5 operational metrics. Each metric needs label, value, sublabel, and state color if relevant.

Good metrics:

- `Acciones pendientes`
- `Provisiones urgentes`
- `DIN por revisar`
- `Diferencias stock`
- `Agentes activos`

## Action Card

Structure:

- Type badge.
- Title with invoice/remesa.
- Description with supplier and reason.
- Urgency badge.
- Timestamp.
- Expandable form or drawer.

CTA must name the operation:

- `Emitir orden de pago`
- `Confirmar pago bancario`
- `Registrar nota AGENSA`
- `Archivar expediente`

## Remesa Drawer

Recommended sections:

1. Header: invoice, supplier, status.
2. Pipeline timeline.
3. Amounts and payment status.
4. Dispatch and DIN.
5. Reconciliation meter.
6. Documents.
7. Agent audit log.

## Evidence Panel

Use for AI decisions:

- Source: email/document/API/manual.
- Extracted data.
- Confidence.
- Rule applied.
- Created action.
- Timestamp.

## Table

Rules:

- Sticky header.
- Tabular numbers.
- Monospace invoice/DIN/dispatch/reference.
- Row hover means clickable.
- Keep columns stable.
- Use horizontal scroll on narrow widths.

## Empty State

Empty states must be useful:

- Say what is empty.
- Say what event fills it.
- Offer exact next action if available.

Example:

`No hay acciones pendientes. El proximo email procesado puede crear una accion automaticamente.`
