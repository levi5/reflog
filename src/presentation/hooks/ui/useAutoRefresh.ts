import { useEffect, useRef } from "react"
import { AUTO_REFRESH_MS, FOCUS_GAP_MS } from "../../../shared/constants/limits"

interface AutoRefreshDeps {
  repoRoot: string
  busy: boolean
  opening: boolean
  refresh: (root: string) => Promise<void> | void
  intervalMs?: number
  focusGapMs?: number
}

export function useAutoRefresh({
  repoRoot,
  busy,
  opening,
  refresh,
  intervalMs = AUTO_REFRESH_MS,
  focusGapMs = FOCUS_GAP_MS,
}: AutoRefreshDeps) {
  const stateRef = useRef({ busy, opening })
  stateRef.current = { busy, opening }
  const refreshRef = useRef(refresh)
  refreshRef.current = refresh

  useEffect(() => {
    if (!repoRoot) return
    const root = repoRoot
    let lastRun = 0
    const tryRefresh = () => {
      const current = stateRef.current
      if (current.busy || current.opening) return
      const now = Date.now()
      if (now - lastRun < focusGapMs) return
      lastRun = now
      void refreshRef.current(root)
    }
    const id = setInterval(tryRefresh, intervalMs)
    const onFocus = () => tryRefresh()
    window.addEventListener("focus", onFocus)
    return () => {
      clearInterval(id)
      window.removeEventListener("focus", onFocus)
    }
  }, [repoRoot, intervalMs, focusGapMs])
}
