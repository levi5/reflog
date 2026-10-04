import classnames from "classnames"
import type { ReactNode } from "react"

import styles from "./style.module.scss"

interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: ReactNode
  title?: string
  disabled?: boolean
  ariaLabel?: string
  size?: "sm" | "md"
}

export function Switch({ checked, onChange, label, title, disabled = false, ariaLabel, size = "md" }: Props) {
  return (
    <label className={classnames(styles.switch, size === "sm" && styles.sm)} title={title}>
      <input
        type="checkbox"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label !== undefined && <span className={styles.label}>{label}</span>}
    </label>
  )
}
