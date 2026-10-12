import classnames from "classnames"
import styles from "./style.module.scss"

interface Props {
  checked: boolean
  onChange: (checked: boolean, range: boolean) => void
  label: string
  title?: string
  disabled?: boolean
  size?: "sm" | "md"
}

export function Checkbox({ checked, onChange, label, title, disabled = false, size = "md" }: Props) {
  return (
    <label className={classnames(styles.wrap, size === "sm" && styles.sm)} title={title ?? label}>
      <input
        type="checkbox"
        className={styles.input}
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => {
          const native = event.nativeEvent as MouseEvent | undefined
          onChange(event.target.checked, native?.shiftKey ?? false)
        }}
      />
      <span className={styles.box} aria-hidden="true" />
    </label>
  )
}
