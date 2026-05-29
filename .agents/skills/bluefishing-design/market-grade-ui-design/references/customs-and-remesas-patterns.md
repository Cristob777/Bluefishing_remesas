# Customs And Remesas Patterns

Borrow from Flexport, iCustoms and Customs4trade: customs work needs timeline, evidence and compliance language.

## Remesa Timeline

Recommended stages:

1. Invoice recibida
2. Condición de pago
3. Orden de pago
4. Pago confirmado
5. Despacho vinculado
6. Provisión recibida
7. DIN conciliada
8. Stock ingresado
9. Expediente archivado

Each stage needs state, date, source and owner.

## DIN Reconciliation

Show:

- DIN number.
- Dispatch number.
- Provision total.
- DIN total.
- Difference.
- Tolerance rule.
- Result: reconciled or review required.

Use `RECONCILIADO` only when the tolerance rule is satisfied and required evidence exists.

## Stock

Stock count UI should compare:

- SKU
- Description
- Invoice quantity
- Received quantity
- Difference
- Claim status

No-difference path should be fast. Difference path should create supplier claim with editable text and evidence.

## Documents

Every customs/remesa document needs:

- Type.
- Linked remesa.
- Source.
- Upload/extraction date.
- Confidence.
- Extracted key fields.
- Raw preview when possible.
