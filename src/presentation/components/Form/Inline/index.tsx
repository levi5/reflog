import type { ReactNode } from "react"
import styles from "./style.module.scss"

interface InlineFormProps {
  onSubmit: () => void
  submitLabel: string
  submitIcon: ReactNode
  disabled?: boolean
  children: ReactNode
  details?: ReactNode
}

export function InlineForm({
  onSubmit,
  submitLabel,
  submitIcon,
  disabled = false,
  children,
  details,
}: InlineFormProps) {
  return (
    <form
      className={styles.form}
      aria-label={submitLabel}
      onSubmit={(event) => {
        event.preventDefault()
        if (!disabled) onSubmit()
      }}
    >
      <div className={styles.row}>
        {children}
        <button type="submit" disabled={disabled} aria-label={submitLabel}>
          {submitIcon}
        </button>
      </div>
      {details}
    </form>
  )
}
