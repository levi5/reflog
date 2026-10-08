import classnames from "classnames"
import type { ReactNode } from "react"
import styles from "./style.module.scss"

export type IconActionTone = "default" | "danger" | "success"

interface IconActionButtonProps {
  icon: ReactNode
  label: string
  onClick?: () => void
  tone?: IconActionTone
  size?: "sm" | "md"
  disabled?: boolean
  className?: string
}

export function IconActionButton({
  icon,
  label,
  onClick,
  tone = "default",
  size = "sm",
  disabled = false,
  className,
}: IconActionButtonProps) {
  return (
    <button
      type="button"
      className={classnames(
        styles.iconAction,
        size === "md" && styles.md,
        tone === "danger" && styles.danger,
        tone === "success" && styles.success,
        className,
      )}
      onClick={onClick}
      title={label}
      aria-label={label}
      disabled={disabled}
    >
      {icon}
    </button>
  )
}
