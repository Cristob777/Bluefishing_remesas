# Agent Workflow Patterns

AI should appear as accountable operations, not magic.

## Agent Card

Every agent card needs:

- Name: `Invoice Agent`, `Customs Agent`, `Stock Agent`.
- State: active, paused, error, needs review.
- Last action with timestamp.
- Success/error count.
- Primary action: retry, pause, view logs, edit rule.

## Agent Event

Every agent event should show:

- Source: email, attachment, API webhook, manual edit.
- Extracted fields.
- Confidence.
- Applied rule.
- Created action or final state.
- Audit timestamp.

## Rules

Rule UI should read like:

- Trigger: `Cuando llega una factura de proveedor permitido`
- Condition: `y el monto estimado es menor a CLP 5.000.000`
- Action: `crear remesa y pedir condición de pago`

Rules need version, owner, last edited date and recent runs.

## Review

Use review when confidence is low or money/compliance risk is high:

- Amount above threshold.
- DIN/provision outside tolerance.
- Unknown supplier.
- Duplicate invoice.
- Missing dispatch number.
- SKU quantity mismatch.

The review action must show recommendation, evidence and consequences.
