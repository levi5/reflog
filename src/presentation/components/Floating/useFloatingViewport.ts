import { invoke, isTauri } from "@tauri-apps/api/core"
import { useEffect } from "react"

// GTK's effective WebKit zoom can differ from Tauri's monitor scale factor.
// Measure CSS viewport pixels against native physical pixels after layout.
export function useFloatingViewport(onError: (message: string) => void) {
  useEffect(() => {
    if (!isTauri() || typeof ResizeObserver === "undefined") return
    let frame = 0
    let active = true
    const synchronize = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        void invoke("sync_floating_viewport", { cssWidth: window.innerWidth, cssHeight: window.innerHeight }).catch(
          (error) => {
            if (active) onError(String(error))
          },
        )
      })
    }
    const observer = new ResizeObserver(synchronize)
    observer.observe(document.documentElement)
    window.addEventListener("resize", synchronize)
    synchronize()
    return () => {
      active = false
      observer.disconnect()
      window.removeEventListener("resize", synchronize)
      cancelAnimationFrame(frame)
    }
  }, [onError])
}
