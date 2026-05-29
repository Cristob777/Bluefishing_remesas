# Motion Playbook

Motion must explain a state change or spatial relationship.

## Durations

- Button hover/press: 100-150ms.
- Table row enter: 140-180ms.
- Drawer open/close: 200-260ms.
- Modal open/close: 160-220ms.
- Timeline completion: 180-260ms.
- Marketing hero reveal: 320-450ms.

## Easing

- Enter: `easeOut`.
- Exit: `easeIn`.
- Small interactive feedback: spring with low bounce.
- Avoid bouncy motion in finance/customs actions.

## Recommended Framer Motion Patterns

```tsx
const row = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.16, ease: 'easeOut' } },
}
```

```tsx
const drawer = {
  hidden: { opacity: 0, x: 24 },
  show: { opacity: 1, x: 0, transition: { duration: 0.22, ease: 'easeOut' } },
  exit: { opacity: 0, x: 16, transition: { duration: 0.16, ease: 'easeIn' } },
}
```

## Do Not Animate

- Large tables with hundreds of rows.
- Numbers changing rapidly unless it aids comprehension.
- Critical destructive confirmations.
- Anything when `prefers-reduced-motion` is active.
