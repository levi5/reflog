import { useEffect } from "react"

export interface ShortcutHandlers {
  onUndo?: () => void
  onRedo?: () => void
  onFind?: () => void
  onQuickOpen?: () => void
  onRefresh?: () => void
  onPalette?: () => void
}

function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  if (!element) return false
  const tag = element.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || element.isContentEditable
}

export function useGlobalShortcuts(handlers: ShortcutHandlers): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey
      const key = event.key.toLowerCase()

      if (key === "f5" || (mod && key === "r" && !event.shiftKey)) {
        event.preventDefault()
        handlers.onRefresh?.()
        return
      }

      if (!mod) return

      if (key === "z" && !event.shiftKey) {
        if (isTypingTarget(event.target)) return
        event.preventDefault()
        handlers.onUndo?.()
        return
      }

      if ((key === "z" && event.shiftKey) || key === "y") {
        if (isTypingTarget(event.target)) return
        event.preventDefault()
        handlers.onRedo?.()
        return
      }

      if (key === "f") {
        event.preventDefault()
        handlers.onFind?.()
        return
      }

      if (key === "p") {
        event.preventDefault()
        handlers.onQuickOpen?.()
        return
      }

      if (key === "k") {
        event.preventDefault()
        handlers.onPalette?.()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [handlers])
}
