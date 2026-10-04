export interface LogoProps {
  size?: number
  withWordmark?: boolean
}

export const Logo = ({ size = 22, withWordmark = true }: LogoProps) => (
  <span className="logo">
    <svg
      className="logo__mark"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="6" cy="6" r="2.4" />
      <circle cx="6" cy="18" r="2.4" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M6 8.4v7.2" />
      <path d="M8.4 6h3.4a2.8 2.8 0 0 1 2.8 2.8v.2" />
      <path d="M17 11.4v.6a3.4 3.4 0 0 1-3.4 3.4H8.6" />
    </svg>
    {withWordmark ? <span className="logo__word">Reflog</span> : null}
  </span>
)

import "./styles.css"
