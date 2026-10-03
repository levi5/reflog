import { useEffect } from "react"

export function useAltShortcut(key: string, run: () => void) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!event.altKey || event.ctrlKey || event.metaKey) return
      if (event.key.toLowerCase() !== key.toLowerCase()) return
      event.preventDefault()
      run()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [key, run])
}
