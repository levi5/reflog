interface LogoMarkProps {
  size?: number
  className?: string
}

export function LogoMark({ size = 72, className }: LogoMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 1024 1024" role="img" aria-label="Reflog" className={className}>
      <defs>
        <linearGradient id="reflog-logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: "var(--accent)" }} />
          <stop offset="1" style={{ stopColor: "var(--grape-deep)" }} />
        </linearGradient>
      </defs>
      <rect width="1024" height="1024" rx="230" fill="url(#reflog-logo-g)" />
      <g fill="none" stroke="#ffffff" strokeWidth="85" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="256" cy="256" r="128" fill="#ffffff" stroke="none" />
        <circle cx="768" cy="768" r="128" fill="#ffffff" stroke="none" />
        <path d="M554 256h128a85 85 0 0 1 85 85v298" />
        <line x1="256" y1="384" x2="256" y2="896" />
      </g>
    </svg>
  )
}
