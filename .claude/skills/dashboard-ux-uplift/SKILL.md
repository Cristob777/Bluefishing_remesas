---
name: dashboard-ux-uplift
description: Audit and uplift a Next.js + Tailwind dashboard to Linear/Stripe-tier UX with Framer Motion micro-animations, contextual empty states, onboarding checklists, sticky tables, command bar (⌘K), and a coherent typography/spacing system. Use when user asks to "improve UX", "the dashboard feels empty", "polish the UI", "add animations", "mejorar dashboard", or when stats render as zeros, error rows look noisy, or empty states have no CTA.
---

# Dashboard UX Uplift

Premium UX/UI overhaul for SaaS dashboards. Reads existing pages, identifies UX gaps by category, and emits surgical diffs an agent can apply.

## Quick start

Run when the user asks to improve the look/feel of a dashboard:

1. **Inventory** the dashboard pages and components. List every route in `app/dashboard/**`, every shared UI primitive in `components/ui/**`, and every empty-state / loading / error path.
2. **Audit** against the 8 categories below. For each page, mark which gaps apply.
3. **Propose** a punch list grouped by impact (High = fixes broken UX, Medium = polish, Low = nice-to-have). Show the user before editing.
4. **Apply** the chosen items as small focused commits — one category per commit so the user can roll back any single area.

## The 8 categories

| # | Category | What good looks like |
|---|----------|----------------------|
| 1 | **Empty states with CTA** | Each empty list has a single primary action (connect Gmail / create first record / link supplier), not just "No data" |
| 2 | **Onboarding checklist** | First-run users see a Linear-style ✓/○ list of setup steps that auto-completes |
| 3 | **Framer Motion micro-anims** | Cards stagger in on mount; numbers count up; skeleton → real data crossfades; route transitions feel intentional |
| 4 | **Typographic hierarchy** | One scale (Geist or system), 4 weights max, consistent spacing tokens; no inline 13px / 15px / 17px chaos |
| 5 | **Loading states** | Skeletons match the final shape (not generic boxes); never block the entire page |
| 6 | **Error states** | Show what failed + a recovery action ("Retry" / "Reconnect Gmail"); never bare red strings |
| 7 | **Sticky-header tables** | Header stays visible on scroll; row hover; zebra optional; click-row → detail |
| 8 | **Command bar (⌘K)** | Fuzzy search across routes + records; ⌘K is the universal "I'm lost" shortcut |

## Workflow

Use this exact checklist when applying the skill:

- [ ] Read `app/layout.tsx` for the typography baseline. If it imports `Inter`, consider swapping to `Geist` for that Vercel feel.
- [ ] Grep for `"No "`, `"empty"`, `"Sin "` to find every empty-state copy. Each one must have an action.
- [ ] Look for `useState` + `loading` patterns. Replace generic spinners with skeletons matching the final shape.
- [ ] Look for `<table>` and check if `<thead>` has `sticky top-0`. Add it.
- [ ] Check if `Cmd+K` is wired anywhere. If not, add a `KBarSearch` mounted in the dashboard layout.
- [ ] For every list/grid render, wrap children in `<motion.div>` with a `stagger` parent and `whileInView` for above-the-fold delight.
- [ ] If `framer-motion` isn't in `package.json`, install it: `npm i framer-motion` and `npm i @next/font` for Geist.

See [REFERENCE.md](REFERENCE.md) for the full library of patterns (copy-paste-ready).
See [EXAMPLES.md](EXAMPLES.md) for before/after snippets applied to a real dashboard.

## What NOT to do

- Don't rewrite a working component just to "modernize" it. Only touch what fails the audit.
- Don't add animations to data tables — they distract; reserve motion for state changes and entrances.
- Don't introduce a new component library mid-project. Stay with what's there; layer Framer Motion + small shadcn-style primitives.
- Don't replace working empty-state copy in Spanish with English (or vice versa); match the surrounding locale.
- Don't add `'use client'` to a server component just to use motion — use it inside child client components.
