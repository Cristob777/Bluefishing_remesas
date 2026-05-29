# Benchmark Patterns

Use these references as product/UX inspiration. Do not copy visual identity, copy structure and interaction logic.

## Numra

Best to borrow:

- AI agents presented as operational workers, not mascots.
- Sections for Agents, Integrations, Rules, Review and Logs.
- Human review as a first-class workflow, not an exception.
- Rules written in plain language with clear triggers and outcomes.
- Agent reasoning visible through evidence, applied rule and confidence.

Bluefishing translation:

- Email Agent, Invoice Agent, Payment Agent, Customs Agent, Stock Agent.
- Every agent event should expose source email/document, extracted fields and why the next action was created.

## Wove

Best to borrow:

- Trade intelligence framing.
- Logistics documents as a pipeline of events.
- Reasoning records for operational decisions.
- AP invoice reconciliation and discrepancy detection before payment.
- Rule builder model: trigger, condition, action.

Bluefishing translation:

- Email received -> invoice extracted -> remesa created -> action pending -> payment -> dispatch -> provision -> DIN -> stock -> archive.
- Use discrepancy cards for duplicate invoice, provision mismatch, DIN difference and missing stock.

## Flexport

Best to borrow:

- Shipment/remesa visibility with strong status hierarchy.
- Customs timeline and document-backed checkpoints.
- Search across invoice, supplier, dispatch, DIN and product/SKU.
- Landed cost and import cost visibility.
- Digital documents retained for audit.

Bluefishing translation:

- Remesa detail is the source of truth.
- Timeline and documents must sit close together.
- Use a right-side drawer for detail so the table context remains visible.

## Stampli

Best to borrow:

- Invoice-centered workspace.
- Approval workflows with comments and audit trail.
- Exception handling for missing data, duplicates and mismatches.
- Context-rich approval drawer.

Bluefishing translation:

- Payment actions should show invoice, supplier, amount, terms, previous payments, evidence and notes in one surface.

## Tipalti

Best to borrow:

- End-to-end AP flow: capture, coding, approval, payment, compliance, reconciliation.
- Supplier compliance and payment status visibility.
- Finance KPIs that show control, not vanity.

Bluefishing translation:

- Payment order, bank confirmation, reference/SWIFT, date and reconciliation must be one governed chain.

## iCustoms

Best to borrow:

- Customs-specific language and compliance posture.
- Country/regime-aware declaration workflows.
- Validation states for duties, taxes, declarations and submissions.

Bluefishing translation:

- DIN and provision screens must emphasize tolerance, due dates, source documents and human review.

## Customs4trade

Best to borrow:

- Centralized customs operations.
- Standardized trade data model.
- API/integration mental model for ERP/WMS/customs systems.

Bluefishing translation:

- Keep consistent names for invoice, dispatch, DIN, provision, SKU and remesa across all screens.

## Awwwards

Best to borrow:

- Composition discipline.
- Strong first viewport for marketing pages.
- More memorable product screenshots.
- Sophisticated type rhythm and purposeful transitions.

Do not borrow:

- Decorative complexity inside dashboard pages.
- Slow scroll hijacks.
- Mystery navigation.
- Low contrast editorial layouts for operational work.

## Motion.dev

Best to borrow:

- Short, purposeful transitions.
- Layout animations that preserve spatial context.
- Reduced-motion-safe patterns.
- Hover/press feedback that feels native.
