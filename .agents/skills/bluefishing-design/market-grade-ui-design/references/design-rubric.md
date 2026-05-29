# Design Rubric

Use this before delivering any Bluefishing UI.

## Premium Signals

- The first glance explains what changed, what needs attention, and what can be safely ignored.
- Status color is consistent across the app.
- Tables are compact, sticky, readable, and support scanning by invoice, supplier, dispatch, DIN and amount.
- Actions sit near the evidence needed to complete them.
- Agent outputs show confidence, source, rule and next step.
- Numbers use tabular figures and Chilean formatting.
- Empty states suggest the next operational move, not generic marketing copy.
- Loading states match final layout shape.

## Amateur Signals To Remove

- Decorative gradients, blobs or oversized cards inside dashboard screens.
- AI described as magic without showing evidence.
- Vague buttons like `Continuar` when the action is actually `Confirmar pago`.
- Dense forms without grouping, labels or validation hints.
- Red used for anything other than urgent/danger.
- Purple used as brand decoration.
- Large hero typography inside operational panels.
- Layout shifts when badges, skeletons or loading text appear.

## Bluefishing Score

Rate the screen 1-5:

- **Clarity**: can an operator complete the task without explanation?
- **Trust**: is the data source and agent reasoning visible?
- **Density**: does it show enough information without becoming noisy?
- **Statefulness**: are all workflow states represented?
- **Polish**: spacing, alignment, type, motion and responsive behavior feel intentional.

Ship only if every category is 4 or 5.
