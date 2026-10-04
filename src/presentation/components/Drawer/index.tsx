import { X } from "lucide-react"
import { type ReactNode, type RefObject, createContext, useContext, useId, useLayoutEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { useTranslation } from "../../context"
import styles from "./style.module.scss"

interface DrawerContextValue {
  closeDrawer: () => void
  titleId: string
}

const DrawerContext = createContext<DrawerContextValue | null>(null)

function useDrawerContext(): DrawerContextValue {
  const contextValue = useContext(DrawerContext)
  if (!contextValue) {
    throw new Error("Drawer.Content must be rendered inside Drawer.Root")
  }
  return contextValue
}

interface DrawerRootProps {
  open: boolean
  onClose: () => void
  name?: string
  width?: number
  ariaLabel?: string
  initialFocus?: RefObject<HTMLElement | null>
  children: ReactNode
}

function DrawerRoot({ open, onClose, name, width = 400, ariaLabel, initialFocus, children }: DrawerRootProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useLayoutEffect(() => {
    if (!open) return
    const dialogElement = dialogRef.current
    if (!dialogElement) return
    const previousFocusedElement = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    if (!dialogElement.open) dialogElement.showModal()
    const focusableElement =
      initialFocus?.current ??
      panelRef.current?.querySelector<HTMLElement>(
        "input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
      ) ??
      panelRef.current?.querySelector<HTMLElement>('button:not([disabled]), [tabindex]:not([tabindex="-1"])')
    ;(focusableElement ?? dialogElement).focus()
    return () => {
      document.body.style.overflow = previousOverflow
      dialogElement.close()
      if (previousFocusedElement instanceof HTMLElement) {
        previousFocusedElement.focus()
      }
    }
  }, [open, initialFocus])

  if (!open) return null

  return createPortal(
    <dialog
      ref={dialogRef}
      className={styles.overlay}
      aria-labelledby={titleId}
      aria-label={ariaLabel ?? name}
      data-drawer={name}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault()
          onCloseRef.current()
        }
      }}
      onCancel={(event) => {
        event.preventDefault()
        onCloseRef.current()
      }}
    >
      <button
        type="button"
        className={styles.backdrop}
        onClick={onClose}
        tabIndex={-1}
        aria-label={ariaLabel ?? name}
      />
      <div ref={panelRef} className={styles.sidebar} style={{ width: `min(${width}px, 100%)` }}>
        <DrawerContext.Provider value={{ closeDrawer: onClose, titleId }}>{children}</DrawerContext.Provider>
      </div>
    </dialog>,
    document.body,
  )
}

interface DrawerContentProps {
  title: ReactNode
  icon?: ReactNode
  toolbar?: ReactNode
  footer?: ReactNode
  closeLabel?: string
  children: ReactNode
}

function DrawerContent({ title, icon, toolbar, footer, closeLabel, children }: DrawerContentProps) {
  const { closeDrawer, titleId } = useDrawerContext()
  const { t } = useTranslation()

  return (
    <>
      <div className={styles.header}>
        <h2 id={titleId}>
          {icon}
          <span>{title}</span>
        </h2>
        <button type="button" className={styles.closeBtn} onClick={closeDrawer} aria-label={closeLabel ?? t("close")}>
          <X size={18} />
        </button>
      </div>
      {toolbar && <div className={styles.toolbar}>{toolbar}</div>}
      <div className={styles.body}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </>
  )
}

interface DrawerLegacyProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  icon?: ReactNode
  toolbar?: ReactNode
  footer?: ReactNode
  width?: number
  ariaLabel?: string
  initialFocus?: RefObject<HTMLElement | null>
  children: ReactNode
}

function DrawerLegacy({
  open,
  onClose,
  title,
  icon,
  toolbar,
  footer,
  width,
  ariaLabel,
  initialFocus,
  children,
}: DrawerLegacyProps) {
  return (
    <DrawerRoot open={open} onClose={onClose} width={width} ariaLabel={ariaLabel} initialFocus={initialFocus}>
      <DrawerContent title={title} icon={icon} toolbar={toolbar} footer={footer}>
        {children}
      </DrawerContent>
    </DrawerRoot>
  )
}

export const Drawer = Object.assign(DrawerLegacy, {
  Root: DrawerRoot,
  Content: DrawerContent,
})
