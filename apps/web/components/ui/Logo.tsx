interface LogoProps {
  size?: 24 | 40 | 64
  className?: string
}

export function Logo({ size = 24, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Hook J-curve */}
      <path
        d="M20 6 C20 6 20 24 20 28 C20 33 16 36 12 34 C8 32 8 28 12 27"
        stroke="#4F46E5"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Eye of hook - circuit node */}
      <circle cx="20" cy="7" r="3" fill="#4F46E5" />
      {/* Circuit lines radiating from node */}
      <path d="M23 7 L28 7" stroke="#06B6D4" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M28 7 L28 12" stroke="#06B6D4" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M20 4 L20 2" stroke="#06B6D4" strokeWidth="1.5" strokeLinecap="round" />
      {/* Network dots */}
      <circle cx="28" cy="7" r="1.5" fill="#06B6D4" />
      <circle cx="28" cy="12" r="1.5" fill="#06B6D4" opacity="0.6" />
      <circle cx="20" cy="2" r="1.5" fill="#06B6D4" opacity="0.6" />
    </svg>
  )
}
