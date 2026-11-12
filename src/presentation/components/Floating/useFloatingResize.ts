import { invoke, isTauri } from "@tauri-apps/api/core"
import { useRef, type PointerEvent } from "react"

export function useFloatingResize(onError: (message: string) => void) {
  const resizing = useRef(false)
  const finishing = useRef(false)
  const native = useRef(Promise.resolve())

  async function finish() {
    if (!resizing.current || finishing.current) return
    finishing.current = true
    try {
      await native.current
      if (isTauri()) await invoke("finish_floating_resize")
    } catch (e) {
      onError(String(e))
    } finally {
      resizing.current = false
      finishing.current = false
    }
  }

  return {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0 || resizing.current) return
      event.preventDefault()
      event.stopPropagation()
      resizing.current = true
      native.current = (async () => {
        try {
          if (isTauri()) await invoke("start_floating_resize")
        } catch (e) {
          resizing.current = false
          onError(String(e))
        }
      })()
    },
    onPointerMove: (event: { buttons: number }) => {
      if (event.buttons === 0) void finish()
    },
    onPointerUp: () => {
      void finish()
    },
    onMouseEnter: (event: { buttons: number }) => {
      if (event.buttons === 0) void finish()
    },
    reset: () => {
      void invoke("reset_floating_panel_size").catch((e) => onError(String(e)))
    },
  }
}
