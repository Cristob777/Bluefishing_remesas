---
name: market-grade-ui-design
description: Use this nested skill when extending Bluefishing dashboard, marketing pages, or prototypes with market-grade UX inspired by Numra, Wove, Flexport, Stampli, Tipalti, iCustoms, Customs4trade, Awwwards and Motion.dev.
---

# Market-Grade UI Design

Use this skill when building production UI or high-fidelity artifacts for Bluefishing. Read only the reference files needed for the current task.

## Source Patterns

- **Numra**: agents, rules, review, logs, human-in-the-loop, evidence.
- **Wove**: trade intelligence, logistics documents, reasoning records, event automation.
- **Flexport**: remesa/shipment visibility, customs timeline, document-backed operations.
- **Stampli**: invoice workspace, approvals, comments, audit trail, exceptions.
- **Tipalti**: capture -> coding -> approval -> payment -> reconciliation.
- **iCustoms / Customs4trade**: customs declarations, compliance, multi-country workflows.
- **Awwwards**: composition and polish only; never sacrifice dashboard clarity.
- **Motion.dev**: purposeful interaction, layout transitions, performance and reduced motion.

## Workflow

1. Identify the user's artifact: dashboard screen, flow, marketing page, slide, mock, or production code.
2. Choose the dominant pattern: agent workflow, invoice approval, remesa timeline, customs reconciliation, stock count, or marketing hero.
3. Use Bluefishing tokens from `../colors_and_type.css` and components from `../ui.css`.
4. Design complete states: loading, empty, error, pending, review required, success, archived.
5. Show AI with evidence: confidence, source document, rule applied, reasoning, audit log.
6. Verify with `references/design-rubric.md` and `references/final-qa-checklist.md`.

## Reference Map

- `references/benchmark-patterns.md` — what to borrow from Numra, Wove, Flexport, Stampli, Tipalti, iCustoms, Customs4trade, Awwwards and Motion.dev.
- `references/design-rubric.md` — quality bar and anti-amateur checks.
- `references/dashboard-patterns.md` — app screens, tables, action queue, drawers.
- `references/agent-workflow-patterns.md` — agents, rules, evidence, confidence and logs.
- `references/invoice-and-approval-patterns.md` — invoice, AP, payment and approval UX.
- `references/customs-and-remesas-patterns.md` — customs, DIN, provision, dispatch and stock UX.
- `references/awwwards-translation-guide.md` — how to use premium visual inspiration without harming operations.
- `references/motion-playbook.md` — motion timing and interaction rules.
- `references/final-qa-checklist.md` — final review before delivery.
