import classnames from "classnames"
import { ChevronDown } from "lucide-react"
import { type ReactNode, useState } from "react"

import { useDismiss } from "../../hooks"

import styles from "./style.module.scss"

export type SelectOption = {
  value: string
  label: string
  icon?: ReactNode
  action?: {
    icon: ReactNode
    title: string
    onClick: () => void
  }
}

type Props = {
  label: string
  value: string
  options: SelectOption[]
  disabled?: boolean
  icon?: ReactNode
  className?: string
  buttonClassName?: string
  onChange: (value: string) => void
}

export function Select({ label, value, options, disabled = false, icon, className, buttonClassName, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false))
  const current = options.find((o) => o.value === value) ?? options[0]

  const pick = (value: string) => () => {
    onChange(value)
    setOpen(false)
  }

  const tooltip = current?.label ? `${label}: ${current.label}` : label

  return (
    <div ref={ref} className={classnames(styles.root, open && styles.open, className)}>
      <button
        type="button"
        className={classnames(styles.btn, buttonClassName)}
        aria-label={label}
        title={tooltip}
        disabled={disabled || options.length === 0}
        onClick={() => setOpen((open) => !open)}
      >
        {icon && <span className={styles.icon}>{icon}</span>}
        {current?.icon && <span className={styles.icon}>{current.icon}</span>}
        <span className={styles.label}>{current?.label ?? "—"}</span>
        <ChevronDown size={13} className={styles.chev} />
      </button>
      {open && (
        <div className={styles.menu} role="listbox" aria-label={label}>
          {options.map((option) => {
            const isSelected = option.value === value
            if (option.action) {
              return (
                <div key={option.value} className={classnames(styles.itemRow, isSelected && styles.active)}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    title={option.label}
                    className={classnames(styles.item, isSelected && styles.active)}
                    onClick={pick(option.value)}
                  >
                    {option.icon && <span className={styles.icon}>{option.icon}</span>}
                    <span className={styles.itemLabel}>{option.label}</span>
                  </button>
                  <button
                    type="button"
                    className={classnames(styles.itemAction, "item-action")}
                    title={option.action.title}
                    aria-label={option.action.title}
                    onClick={(event) => {
                      event.stopPropagation()
                      option.action?.onClick()
                    }}
                  >
                    {option.action.icon}
                  </button>
                </div>
              )
            }
            return (
              <button
                type="button"
                key={option.value}
                role="option"
                aria-selected={isSelected}
                title={option.label}
                className={classnames(styles.item, isSelected && styles.active)}
                onClick={pick(option.value)}
              >
                {option.icon && <span className={styles.icon}>{option.icon}</span>}
                <span className={styles.itemLabel}>{option.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
