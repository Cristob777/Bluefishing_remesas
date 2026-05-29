# Dashboard Improvement Plan

Use this roadmap to upgrade the Bluefishing dashboard without turning it into a decorative landing page.

## Priority 1: Actions As The Operating Center

Improve `/dashboard/actions` first because it is where users finish work.

Add or improve:

- Stage grouping by workflow: factura, pagos, despacho, aduana, stock, cierre.
- Action cards with exact CTA: `Definir pago`, `Emitir orden`, `Confirmar banco`, `Registrar nota AGENSA`.
- Context drawer/panel with invoice, supplier, amount, evidence, rule and audit.
- Persistent pending/urgent counters.
- Completion feedback and fast reload.
- Clear accounting exception UI for `SALDO_FAVOR_AGENSA`.

Avoid:

- Big decorative cards.
- Hidden actions behind unclear menus.
- Buttons named only `Guardar` or `Continuar`.

## Priority 2: Remesa Detail Drawer

Improve `/dashboard/remesas` so each remesa feels like an expediente.

Add or improve:

- Sticky table header.
- Row click opens detail drawer.
- Drawer sections: timeline, amounts, payments, dispatch, provision, DIN, stock, documents, agent logs.
- Reconciliation meter: provision vs DIN, tolerance CLP 50.000, saldo a favor.
- Status badges and stage progress.
- Document evidence links or preview placeholders.

## Priority 3: Overview Command Center

Improve `/dashboard/overview` as a daily operational briefing.

Show:

- Actions pending.
- Urgent provisions.
- Remesas active.
- DIN pending/review.
- Stock discrepancies.
- Agent health.
- Gmail/auth errors.
- Latest processed documents.

Do not make it a marketing hero. The first screen should be immediately useful.

## Priority 4: Agents View

Improve `/dashboard/agents` around trust and traceability.

Show:

- Agent cards with status, last run, success/error counts.
- Reasoning panel: source, extracted fields, rule, confidence.
- Error banner with retry path.
- Live log with deduplication.
- Filters by agent and result.

## Priority 5: Stock

Improve `/dashboard/stock` for physical operations.

Show:

- Pending receptions.
- SKU count table.
- Expected vs received.
- Difference status.
- Fast no-difference path.
- Supplier claim path when there are differences.
