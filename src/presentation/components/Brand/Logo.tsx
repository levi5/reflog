interface LogoMarkProps {
  size?: number
  className?: string
}

export function LogoMark({ size = 72, className }: LogoMarkProps) {
  const strokeWidth = size <= 24 ? 2.2 : 1.7

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="Reflog"
      className={className}
    >
      <path d="M6 8.4v7.2" />
      <path d="M8.4 6h3.4a2.8 2.8 0 0 1 2.8 2.8v.2" />
      <path d="M17 11.4v.6a3.4 3.4 0 0 1-3.4 3.4H8.6" />
      <circle cx="6" cy="6" r="2.4" />
      <circle cx="6" cy="18" r="2.4" />
      <circle cx="17" cy="9" r="2.4" />
    </svg>
  )
}
