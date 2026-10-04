import { useEffect, useState } from "react"

const TICK_MS = 1000

export function useElapsed(startedAt: number | null): number {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (startedAt === null) {
      setElapsed(0)
      return
    }
    const tick = () => setElapsed(Math.max(0, Date.now() - startedAt))
    tick()
    const timer = window.setInterval(tick, TICK_MS)
    return () => window.clearInterval(timer)
  }, [startedAt])

  return elapsed
}

export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const seconds = totalSeconds % 60
  const minutes = Math.floor(totalSeconds / 60)
  if (minutes < 60) return `${minutes}:${seconds.toString().padStart(2, "0")}`
  const hours = Math.floor(minutes / 60)
  return `${hours}:${(minutes % 60).toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
}
