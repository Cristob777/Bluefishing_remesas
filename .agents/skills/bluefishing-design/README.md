# Bluefishing Design

Bluefishing is an AI-agent-native operational dashboard for Chilean import operations. It turns emails, supplier invoices, customs provisions, DINs, payments, stock counts, reconciliation and archive actions into one traceable workflow.

The brand should feel like a serious operational console with a quiet layer of intelligence: fast, controlled, trustworthy, and precise. It should not feel like a crypto product, AI toy, generic SaaS landing page, or decorative agency concept.

## Product Language

Use Spanish (Chile) for UI copy. Prefer short, direct labels:

- `Resumen`
- `Remesas`
- `Acciones`
- `Stock`
- `Agentes`
- `Documentos`
- `Configuración`
- `Factura recibida`
- `Pago pendiente`
- `Provisión recibida`
- `DIN conciliada`
- `Expediente archivado`

Use tú-form for instructions:

- `Revisa la diferencia antes de aprobar.`
- `Confirma la fecha real del pago.`
- `Vincula el despacho para continuar.`

Avoid exclamation marks, cute copy, emoji, fake AI magic, and marketing slogans inside the app.

## Brand Foundations

Bluefishing combines two signals:

- **Cobalt** for human decision and primary action.
- **Teal** for agents, automation, extraction, confidence and evidence.

Neutrals should carry most of the interface. Color should identify state, priority or ownership, not decorate.

## Visual Voice

The dashboard should borrow its confidence from tools like Numra, Wove and Flexport:

- Numra: agents, rules, review, logs, human-in-the-loop.
- Wove: trade intelligence, document automation, reasoning records.
- Flexport: shipment visibility, customs timeline, document-backed operations.
- Stampli and Tipalti: invoice approval, payment control, audit trail.

Awwwards and Motion.dev can influence composition and motion, but never at the expense of operational clarity.

## Iconography

Use Lucide outlined icons at `1.75px` stroke. Icons should name objects and actions: `Inbox`, `FileText`, `Landmark`, `Package`, `Ship`, `Receipt`, `Bot`, `Zap`, `Archive`, `AlertTriangle`, `CheckCircle`.

Do not use animated brains, robot mascots, decorative blobs, or icons inside random colored circles unless the color encodes state.

## Layout

Dashboard layouts should be dense but breathable:

- Left sidebar fixed width, compact nav, clear active state.
- Page header with eyebrow, title, action cluster, and one-line context.
- Tables with sticky headers, tabular numbers and row hover affordance.
- Drawers for action completion, document evidence and remesa detail.
- Timeline for invoice -> payment -> dispatch -> customs -> DIN -> stock -> archive.
- Command menu for remesa, invoice, supplier and dispatch search.

Marketing pages can be more editorial, but must show the actual product in the first viewport.

## Motion

Motion should explain a workflow state change:

- Rows enter with short fade/translate.
- Drawers slide from the right.
- Timeline steps transition when completed.
- Skeletons shimmer quietly while loading.
- Badges can pulse only for live agent activity or urgent pending work.

Respect `prefers-reduced-motion`.
