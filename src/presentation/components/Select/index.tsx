import classnames from "classnames"
import { ChevronDown } from "lucide-react"
import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from "react"

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
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const appliedValueRef = useRef<string | null>(null)
  const listId = useId()
  const isInteractive = !disabled && options.length > 0
  const current = options.find((option) => option.value === value) ?? options[0]

  const close = useCallback((restoreFocus = true) => {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }, [])

  const focusList = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.focus({ preventScroll: true }))
  }, [])

  const openList = useCallback(() => {
    setActiveIndex(
      Math.max(
        0,
        options.findIndex((option) => option.value === value),
      ),
    )
    setOpen(true)
    focusList()
  }, [focusList, options, value])

  useEffect(() => {
    if (!open) {
      appliedValueRef.current = null
      return
    }
    if (appliedValueRef.current === value) return
    appliedValueRef.current = value
    setActiveIndex(
      Math.max(
        0,
        options.findIndex((option) => option.value === value),
      ),
    )
  }, [open, options, value])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    const onFocusIn = (event: FocusEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        close()
      }
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("focusin", onFocusIn)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("focusin", onFocusIn)
      document.removeEventListener("keydown", onKey)
    }
  }, [open, close])

  useEffect(() => {
    if (!open) return
    listRef.current?.querySelectorAll<HTMLElement>('[role="option"]')[activeIndex]?.scrollIntoView({ block: "nearest" })
  }, [open, activeIndex])

  const commit = (optionValue: string) => {
    onChange(optionValue)
    close()
  }

  const onTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!isInteractive) return
    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      if (!open) openList()
    } else if (open && event.key === "Escape") {
      event.preventDefault()
      close()
    }
  }

  const onListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveIndex((prev) => Math.min(prev + 1, options.length - 1))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex((prev) => Math.max(prev - 1, 0))
    } else if (event.key === "Home") {
      event.preventDefault()
      setActiveIndex(0)
    } else if (event.key === "End") {
      event.preventDefault()
      setActiveIndex(Math.max(options.length - 1, 0))
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      const option = options[activeIndex]
      if (option) commit(option.value)
    } else if (event.key === "Escape") {
      event.preventDefault()
      close()
    } else if (event.key === "Tab") {
      close(false)
    }
  }

  const tooltip = current?.label ? `${label}: ${current.label}` : label
  const activeId = open && options.length > 0 ? `${listId}-opt-${activeIndex}` : undefined

  return (
    <div ref={rootRef} className={classnames(styles.root, open && styles.open, className)}>
      <button
        ref={triggerRef}
        type="button"
        className={classnames(styles.btn, buttonClassName)}
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={activeId}
        title={tooltip}
        disabled={!isInteractive}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={onTriggerKeyDown}
      >
        {icon && <span className={styles.icon}>{icon}</span>}
        {current?.icon && <span className={styles.icon}>{current.icon}</span>}
        <span className={styles.label}>{current?.label ?? "—"}</span>
        <ChevronDown size={13} className={styles.chev} />
      </button>
      {open && (
        <div
          ref={listRef}
          id={listId}
          className={styles.menu}
          role="listbox"
          aria-label={label}
          tabIndex={-1}
          onKeyDown={onListKeyDown}
        >
          {options.map((option, optionIndex) => {
            const isSelected = option.value === value
            const isActive = optionIndex === activeIndex
            const optionProps = {
              id: `${listId}-opt-${optionIndex}`,
              role: "option" as const,
              "aria-selected": isSelected,
              "data-active": isActive,
              tabIndex: -1,
              title: option.label,
              className: classnames(styles.item, (isSelected || isActive) && styles.active),
              onMouseEnter: () => setActiveIndex(optionIndex),
            }
            if (option.action) {
              return (
                <div key={option.value} className={styles.itemRow}>
                  <button type="button" {...optionProps} onClick={() => commit(option.value)}>
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
              <button type="button" key={option.value} {...optionProps} onClick={() => commit(option.value)}>
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
