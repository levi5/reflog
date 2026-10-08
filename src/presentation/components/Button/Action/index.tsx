import classnames from "classnames"
import type { ReactNode } from "react"
import styles from "./style.module.scss"

export type ActionTone = "default" | "danger"

interface ActionButtonProps {
  children: ReactNode
  onClick?: () => void
  icon?: ReactNode
  title?: string
  ariaLabel?: string
  tone?: ActionTone
  size?: "sm" | "md"
  disabled?: boolean
  className?: string
}

export function ActionButton({
  children,
  onClick,
  icon,
  title,
  ariaLabel,
  tone = "default",
  size = "sm",
  disabled = false,
  className,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      className={classnames(styles.action, size === "md" && styles.md, tone === "danger" && styles.danger, className)}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      disabled={disabled}
    >
      {icon}
      {children}
    </button>
  )
}
