import type { KeyboardEvent as ReactKeyboardEvent } from "react"

export const FOCUSABLE_SELECTOR =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"]), [tabIndex]:not([tabIndex="-1"])'

export function visibleFocusables(container: HTMLElement | null): HTMLElement[] {
  if (!container) return []
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement,
  )
}

export function trapFocus(event: ReactKeyboardEvent<HTMLElement>, container: HTMLElement | null): void {
  if (event.key !== "Tab" || !container) return
  const focusables = visibleFocusables(container)
  if (focusables.length === 0) return
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
