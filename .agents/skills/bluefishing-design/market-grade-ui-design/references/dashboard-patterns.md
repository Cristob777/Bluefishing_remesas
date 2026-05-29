# Dashboard Patterns

## Core Navigation

Use this module order:

1. Resumen
2. Remesas
3. Acciones
4. Stock
5. Agentes
6. Documentos
7. Rules
8. Configuración

Keep labels Spanish and short.

## Resumen

Show:

- Acciones pendientes
- Remesas activas
- Pagos por emitir
- DIN por conciliar
- Discrepancias
- Estado de agentes
- Documentos recién procesados
- Alertas críticas

## Remesa Detail

Treat every remesa as a living expediente:

- Header: invoice, supplier, amount, status, urgency.
- Timeline: invoice -> terms -> payment order -> bank confirmation -> dispatch -> customs provision -> DIN -> stock -> archive.
- Evidence tabs: email, invoice, attachment, provision, DIN, bank reference.
- Action drawer: complete current task without leaving the context.
- Audit log: human and agent events deduplicated.

## Actions Queue

Actions should be grouped by urgency and workflow block:

- Definir condición de pago
- Emitir orden de pago
- Confirmar pago bancario
- Vincular despacho
- Confirmar provisión
- Revisar DIN
- Ingresar stock
- Reclamo a proveedor
- Aprobar operación
- Archivar expediente

Each action row needs invoice, supplier, amount, due date, reason, and primary action.

## Tables

- Sticky header.
- Monospace for invoice, dispatch, DIN, SWIFT/reference.
- Status badge in the same column position across screens.
- Row hover should indicate clickability.
- Use drawers for details, not page reloads when possible.
