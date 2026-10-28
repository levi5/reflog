import { invoke, isTauri } from "@tauri-apps/api/core"
import { useRef, type PointerEvent } from "react"

// A click opens the menu; only intentional movement starts a native drag.
export function useFloatingDrag(onError: (message: string) => void, beforeDrag?: () => Promise<unknown>) {
  const start = useRef<{ x: number; y: number } | null>(null)
  const dragging = useRef(false)
  const finishing = useRef(false)
  const native = useRef(Promise.resolve())

  async function finish() {
    start.current = null
    if (!dragging.current || finishing.current) return
    finishing.current = true
    try {
      await native.current
      if (isTauri()) await invoke("finish_floating_drag")
    } catch (e) {
      onError(String(e))
    } finally {
      dragging.current = false
      finishing.current = false
    }
  }

  return {
    dragging,
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.button === 0) start.current = { x: event.screenX, y: event.screenY }
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      if (event.buttons === 0) {
        void finish()
        return
      }
      if (!start.current || dragging.current) return
      if (Math.hypot(event.screenX - start.current.x, event.screenY - start.current.y) < 5) return
      start.current = null
      dragging.current = true
      native.current = (async () => {
        try {
          await beforeDrag?.()
          if (finishing.current || !dragging.current) return
          if (isTauri()) await invoke("drag_floating")
        } catch (e) {
          dragging.current = false
          onError(String(e))
        }
      })()
    },
    onPointerUp: () => {
      void finish()
    },
    onPointerCancel: () => {
      start.current = null
    },
    onMouseEnter: (event: { buttons: number }) => {
      if (event.buttons === 0) void finish()
    },
  }
}
