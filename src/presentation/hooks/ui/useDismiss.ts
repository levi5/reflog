import { type RefObject, useEffect, useRef } from "react"

export function useDismiss<T extends HTMLElement>(open: boolean, onClose: () => void): RefObject<T | null> {
  const ref = useRef<T | null>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!open) return
    const outside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        closeRef.current()
      }
    }
    const focusLeft = (e: FocusEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        closeRef.current()
      }
    }
    const esc = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current()
    }
    document.addEventListener("mousedown", outside)
    document.addEventListener("focusin", focusLeft)
    document.addEventListener("keydown", esc)
    return () => {
      document.removeEventListener("mousedown", outside)
      document.removeEventListener("focusin", focusLeft)
      document.removeEventListener("keydown", esc)
    }
  }, [open])

  return ref
}
