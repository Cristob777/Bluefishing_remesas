# Invoice And Approval Patterns

Borrow from Stampli and Tipalti: approval is a workspace, not a button.

## Invoice Workspace

Show in one view:

- Supplier
- Invoice number
- Issue date
- Currency and amount
- Extracted line items
- Payment terms
- Attachments
- Source email
- Agent confidence
- Current action

## Payment Flow

Use a staged chain:

1. Define payment terms.
2. Emit payment order.
3. Confirm bank payment.
4. Store reference/SWIFT.
5. Reconcile with remesa.

Each stage must have owner, timestamp and evidence.

## Approval Drawer

The drawer should include:

- Decision summary.
- Money at risk.
- Why approval is required.
- Rule threshold.
- Evidence table.
- Approve and reject actions.
- Notes field.

## Exceptions

Common exception states:

- Duplicate invoice.
- Unknown supplier.
- Missing invoice amount.
- Currency mismatch.
- Payment already emitted.
- Amount exceeds approval threshold.

Use red only when action is urgent or blocking. Use orange for review.
