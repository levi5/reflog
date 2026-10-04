import classnames from "classnames"
import { ChevronDown } from "lucide-react"
import { type ReactNode, useCallback, useId, useState } from "react"

import styles from "./style.module.scss"

interface Props {
  title: ReactNode
  icon?: ReactNode
  description?: ReactNode
  defaultOpen?: boolean
  open?: boolean
  onToggle?: (open: boolean) => void
  className?: string
  children: ReactNode
}

export function Accordion({
  title,
  icon,
  description,
  defaultOpen = false,
  open,
  onToggle,
  className,
  children,
}: Props) {
  const [innerOpen, setInnerOpen] = useState(defaultOpen)
  const isOpen = open ?? innerOpen
  const bodyId = useId()
  const titleId = useId()

  const toggle = useCallback(() => {
    const next = !isOpen
    if (open === undefined) setInnerOpen(next)
    onToggle?.(next)
  }, [isOpen, open, onToggle])

  const close = useCallback(() => {
    if (open === undefined) setInnerOpen(false)
    onToggle?.(false)
  }, [open, onToggle])

  return (
    <div className={classnames(styles.root, isOpen && styles.open, className)}>
      <button
        type="button"
        className={styles.header}
        aria-expanded={isOpen}
        aria-controls={bodyId}
        onClick={toggle}
        onKeyDown={(event) => {
          if (event.key === "Escape" && isOpen) close()
        }}
      >
        {icon && <span className={styles.icon}>{icon}</span>}
        <span id={titleId} className={styles.title}>
          {title}
        </span>
        {description && <span className={styles.desc}>{description}</span>}
        <ChevronDown size={15} className={styles.chev} aria-hidden />
      </button>
      <div className={styles.body}>
        <section id={bodyId} aria-labelledby={titleId} className={styles.inner}>
          <div className={styles.content}>{children}</div>
        </section>
      </div>
    </div>
  )
}
