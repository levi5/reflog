import { _Either } from "funcio"
import type { MouseEvent } from "react"
import { getCurrentWindow } from "@tauri-apps/api/window"

const INTERACTIVE_SELECTOR = "button, input, select, textarea, a, [role='option'], [role='listbox'], .cselect-menu"

const isInteractive = (event: MouseEvent<Element>): boolean => {
  const target = event.target as Element | null
  if (!target) return false
  return target.closest(INTERACTIVE_SELECTOR) !== null
}

const dragWindow = () => {
  _Either.try.sync(() => getCurrentWindow().startDragging())
}

const maxWindow = () => {
  _Either.try.sync(() =>
    getCurrentWindow()
      .toggleMaximize()
      .catch(() => undefined),
  )
}

export function useWindowDrag() {
  const onMouseDown = (event: MouseEvent) => {
    if (event.button !== 0 || isInteractive(event)) return
    dragWindow()
  }

  const onDoubleClick = (event: MouseEvent) => {
    if (isInteractive(event)) return
    maxWindow()
  }

  return { onMouseDown, onDoubleClick }
}
