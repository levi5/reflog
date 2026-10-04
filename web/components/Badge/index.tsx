export interface BadgeProps {
  label: string
  tone?: "accent" | "neutral" | "success"
}

export const Badge = ({ label, tone = "neutral" }: BadgeProps) => (
  <span className={`badge badge--${tone}`}>{label}</span>
)

import "./styles.css"
