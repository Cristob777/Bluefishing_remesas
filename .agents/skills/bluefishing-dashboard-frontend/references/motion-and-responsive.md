# Motion And Responsive

Motion must explain state changes.

## Durations

- Button hover/press: 100-150ms.
- Row enter: 140-180ms.
- Drawer open: 200-260ms.
- Modal open: 160-220ms.
- Skeleton shimmer: 1200-1600ms loop.

## Use Motion For

- Table row entry.
- Drawer transition.
- Collapsible action forms.
- Command menu.
- Timeline step completion.
- Loading skeletons.

## Avoid Motion For

- Large table reflows.
- Money values changing quickly.
- Critical destructive confirmation.
- Any effect under `prefers-reduced-motion`.

## Responsive Rules

- Dashboard desktop: sidebar + dense content.
- Tablet: keep sidebar if space allows, otherwise compact.
- Mobile: stack metrics, horizontal scroll tables, drawer becomes full-screen sheet.
- No text overlap.
- Buttons must keep readable labels or become icon buttons with tooltip.
- Tables must not squeeze columns until data becomes unreadable.

## Accessibility

- Visible focus states.
- Buttons use `button`, links use `a`.
- Form labels are explicit.
- Error text sits next to field or form.
- Color is not the only indicator of state.
