import classnames from "classnames"
import type { ReactNode } from "react"

export interface NavToggleButtonProps {
  title: string
  ariaLabel: string
  isActive: boolean
  onToggle: () => void
  children: ReactNode
}

export function NavToggleButton({ title, ariaLabel, isActive, onToggle, children }: NavToggleButtonProps) {
  return (
    <button
      type="button"
      className={classnames("icon-btn", isActive && "active")}
      onClick={onToggle}
      title={title}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  )
}
