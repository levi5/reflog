import classnames from "classnames"
import { X } from "lucide-react"
import { type ReactNode, type RefObject, useId, useLayoutEffect, useRef } from "react"
import { createPortal } from "react-dom"
import styles from "./style.module.scss"

interface Props {
  title: ReactNode
  onClose: () => void
  actions?: ReactNode
  /** @deprecated use size="lg" instead */
  wide?: boolean
  size?: "sm" | "md" | "lg"
  open?: boolean
  closeOnBackdrop?: boolean
  initialFocus?: RefObject<HTMLElement | null>
}

export function Modal({
  title,
  onClose,
  actions,
  wide = false,
  size,
  open = true,
  closeOnBackdrop = true,
  initialFocus,
  children,
}: Props & { children: ReactNode }) {
  const titleId = useId()
  const boxRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useLayoutEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const target =
      initialFocus?.current ??
      boxRef.current?.querySelector<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ??
      closeRef.current
    target?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onCloseRef.current()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = previousOverflow
      if (previousFocus instanceof HTMLElement) previousFocus.focus()
    }
  }, [open, initialFocus])

  if (!open) return null

  const resolvedSize = size ?? (wide ? "lg" : "md")

  return createPortal(
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop click-to-close on a presentational overlay; the inner dialog carries semantics
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={boxRef}
        className={classnames(styles.box, resolvedSize === "sm" && styles.sm, resolvedSize === "lg" && styles.wide)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className={styles.head}>
          <h4 id={titleId}>{title}</h4>
          <button ref={closeRef} type="button" className="mini-btn" onClick={onClose} aria-label="close">
            <X size={13} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {actions && <div className={styles.foot}>{actions}</div>}
      </div>
    </div>,
    document.body,
  )
}
