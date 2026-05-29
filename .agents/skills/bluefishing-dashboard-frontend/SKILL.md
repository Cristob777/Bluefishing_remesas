---
name: bluefishing-dashboard-frontend
description: Use this skill when improving or building Bluefishing dashboard frontend screens in apps/web. It gives Claude/Codex concrete execution rules for operational dashboard UX, remesas, actions, agents, stock, documents, motion, responsive QA, and production-ready React/Next implementation.
user-invocable: true
---

# Bluefishing Dashboard Frontend

Use this skill when the user asks to improve, redesign, implement, polish, or QA the Bluefishing dashboard frontend.

Primary code area:

- `apps/web/app/dashboard/overview/page.tsx`
- `apps/web/app/dashboard/remesas/page.tsx`
- `apps/web/app/dashboard/actions/page.tsx`
- `apps/web/app/dashboard/agents/page.tsx`
- `apps/web/app/dashboard/stock/page.tsx`
- `apps/web/app/dashboard/settings/page.tsx`
- `apps/web/components/**`
- `apps/web/app/globals.css`

If `.agents/skills/bluefishing-design/` exists, use its tokens and brand rules. If it is not present, follow the rules in this skill.

## Non-Negotiables

1. Operational clarity beats visual ambition.
2. Spanish Chile UI copy. Code identifiers stay English.
3. Cobalt/indigo is human primary action. Teal/cyan is agents/AI. Red is urgent only. Orange is review/accounting exception.
4. AI must show evidence, confidence, rule, source document, and audit trail.
5. Do not create landing-page composition inside the dashboard.
6. Do not add decorative blobs, purple gradients, nested cards, fake marketing copy, or mascot AI.
7. Preserve backend contracts, API routes, migrations, auth, settings, and workflow actions unless the task explicitly requires backend work.
8. After code changes, run `npm run build` from `apps/web`.

## Workflow

1. Inspect the current dashboard screen and adjacent components.
2. Identify the user's target workflow: remesa review, action completion, agents, stock, settings, documents, or overview.
3. Apply the smallest production-quality improvement that makes the workflow faster, clearer, and safer.
4. Use existing local style first: `Badge`, `EmptyState`, `TableSkeleton`, `KBarSearch`, `SidebarNav`, CSS variables, and existing page layout.
5. Add or reuse components only when it reduces duplication or makes a workflow easier to scan.
6. Include loading, empty, error, pending, review required, success, and archived states when relevant.
7. Verify responsive behavior, table overflow, text fit, keyboard/focus states, and build.

## Reference Map

Read only the files needed:

- `references/dashboard-improvement-plan.md` for the recommended upgrade roadmap.
- `references/screen-specs.md` for each dashboard screen.
- `references/component-patterns.md` for reusable UI patterns.
- `references/motion-and-responsive.md` for animation and viewport rules.
- `references/qa-checklist.md` before final delivery.
- `references/claude-execution-prompt.md` when the user wants a prompt for Claude Design/Claude Code.

## Default Output

When invoked without a specific screen, propose and implement the highest leverage dashboard polish in this order:

1. Actions queue clarity and completion drawers.
2. Remesa detail drawer with timeline, documents, payment, DIN, stock, and audit.
3. Overview operational command center.
4. Agents evidence/log view.
5. Stock count and discrepancy handling.

Keep the final response short: changed files, build status, and where to see the improvement.
