import classnames from "classnames"
import { X } from "lucide-react"
import { type ReactNode, type RefObject, useId, useLayoutEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { useTranslation } from "../../context"
import { isTopModal, modalStackDepth, pushModal } from "../../hooks/ui/useModalStack"
import styles from "./style.module.scss"

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"]), [tabIndex]:not([tabIndex="-1"])'

interface Props {
  title: ReactNode
  onClose: () => void
  actions?: ReactNode
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
  const bodyRef = useRef<HTMLDivElement>(null)
  const modalId = useRef(Symbol("modal"))
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const { t } = useTranslation()

  useLayoutEffect(() => {
    if (!open) return
    const id = modalId.current
    const release = pushModal(id)
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const target = initialFocus?.current ?? bodyRef.current?.querySelector<HTMLElement>(FOCUSABLE) ?? closeRef.current
    target?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (!isTopModal(id)) return
      if (e.key === "Escape") {
        e.preventDefault()
        e.stopPropagation()
        onCloseRef.current()
      }
      if (e.key === "Tab" && boxRef.current) {
        const focusables = Array.from(boxRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
          (el) => el.offsetParent !== null || el === document.activeElement,
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener("keydown", onKey, true)
    return () => {
      document.removeEventListener("keydown", onKey, true)
      release()
      if (modalStackDepth() === 0) document.body.style.overflow = previousOverflow
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus()
    }
  }, [open, initialFocus])

  if (!open) return null

  const resolvedSize = size ?? (wide ? "lg" : "md")

  return createPortal(
    <dialog
      open
      className={styles.overlay}
      aria-labelledby={titleId}
      onMouseDown={(event) => {
        if (closeOnBackdrop && isTopModal(modalId.current) && event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        ref={boxRef}
        className={classnames(styles.box, resolvedSize === "sm" && styles.sm, resolvedSize === "lg" && styles.wide)}
      >
        <div className={styles.head}>
          <h4 id={titleId}>{title}</h4>
          <button ref={closeRef} type="button" className="mini-btn" onClick={onClose} aria-label={t("close")}>
            <X size={13} />
          </button>
        </div>
        <div ref={bodyRef} className={styles.body}>
          {children}
        </div>
        {actions && <div className={styles.foot}>{actions}</div>}
      </div>
    </dialog>,
    document.body,
  )
}
