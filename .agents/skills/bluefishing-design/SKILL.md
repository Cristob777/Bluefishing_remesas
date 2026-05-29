---
name: bluefishing-design
description: Use this skill to generate well-branded interfaces and assets for Bluefishing — an AI-agent-native operational dashboard for Chilean import operations (emails, invoices, customs/DIN, payments, stock, reconciliation). Contains design guidelines, color and type tokens, fonts, brand assets, and high-fidelity UI kits for the dashboard app and the marketing site.
user-invocable: true
---

Read the `README.md` file at the root of this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view.

If working on production code, copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Map

- `README.md` — brand context, content fundamentals, visual foundations, iconography.
- `colors_and_type.css` — all design tokens (light + dark themes).
- `ui.css` — component primitives (buttons, inputs, badges, status pills, tables, agent strips).
- `assets/` — logos (mark + wordmark, light/dark).
- `fonts/` — Google Fonts loaded via CDN (Geist, Geist Mono, Source Serif 4).
- `preview/` — design-system cards for visual reference.
- `ui_kits/dashboard/` — full app shell (Resumen, Remesas, Acciones, Agentes, Documentos, Rules).
- `ui_kits/marketing/` — bluefishing.cl landing.
- `market-grade-ui-design/` — a deeper, agent-runtime skill for *building* in this style. Read its `SKILL.md` when extending the dashboard.

## Non-negotiables when designing in this brand

1. **Operational clarity beats visual ambition.** Dashboards are used 6+ hours/day — density, status-by-color, scannable.
2. **AI is shown with evidence, never as magic.** Show confidence, rule, reasoning, audit log.
3. **Cobalt = human action. Teal = agent / AI. Other color = state, never decoration.**
4. **Spanish (Chile) for product copy.** English for code. Tú-form. No exclamation marks. No emoji.
5. **No purple gradients, no decorative blobs, no animated brain icons.** Lucide outlined, 1.75 stroke.

When in doubt, read `market-grade-ui-design/references/design-rubric.md` and `final-qa-checklist.md`.
