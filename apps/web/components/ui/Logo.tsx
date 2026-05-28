interface LogoProps {
  size?: 20 | 24 | 28 | 40 | 64
  className?: string
}

export function Logo({ size = 24, className }: LogoProps) {
  return (
    <svg
      width={Math.round(size * 2.1)}
      height={size}
      viewBox="0 0 84 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Bluefishing"
    >
      <defs>
        <linearGradient id="bf-mahi" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="55%" stopColor="#5B6FE0" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
      </defs>
      <path
        d="M 22 14 C 30 4, 58 3, 70 8 L 70 13 C 56 14, 30 14, 22 14 Z"
        fill="url(#bf-mahi)"
        opacity="0.78"
      />
      <path
        d="M 18 18 C 28 14, 48 12, 60 11 C 66 5, 76 5, 80 12 L 82 15 L 81 18 L 79 21 C 76 24, 70 26, 60 27 C 48 29, 30 29, 22 27 C 20 26, 18 25, 18 23 L 4 32 L 14 21 L 4 8 Z"
        fill="url(#bf-mahi)"
      />
      <path d="M 36 23 C 42 29, 48 29, 50 25 C 44 24, 40 23, 36 23 Z" fill="rgba(255,255,255,0.20)" />
      <path d="M 20 22 C 38 23, 60 23, 75 21" stroke="rgba(255,255,255,0.20)" strokeWidth="0.8" />
      <circle cx="72" cy="13" r="1.7" fill="#FFFFFF" />
      <circle cx="72.3" cy="13" r="0.9" fill="#14141A" />
    </svg>
  )
}
