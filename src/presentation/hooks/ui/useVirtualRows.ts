import { useCallback, useEffect, useMemo, useRef, useState } from "react"

export interface VirtualRowsOptions {
  count: number
  estimate: number
  overscan?: number
  enabled?: boolean
}

export interface VirtualRowsResult {
  items: { index: number }[]
  offsetTop: number
  totalHeight: number
  onScroll: (event: { currentTarget: { scrollTop: number; clientHeight: number } }) => void
  reset: () => void
}

export function useVirtualRows({
  count,
  estimate,
  overscan = 12,
  enabled = true,
}: VirtualRowsOptions): VirtualRowsResult {
  const [scrollTop, setScrollTop] = useState(0)
  const [viewport, setViewport] = useState(0)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
  }, [])

  const onScroll = useCallback((event: { currentTarget: { scrollTop: number; clientHeight: number } }) => {
    const nextTop = event.currentTarget.scrollTop
    const nextHeight = event.currentTarget.clientHeight
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      setScrollTop(nextTop)
      setViewport(nextHeight)
    })
  }, [])

  const reset = useCallback(() => {
    setScrollTop(0)
    setViewport(0)
  }, [])

  return useMemo(() => {
    if (!enabled || count === 0) {
      const all = Array.from({ length: count }, (_, index) => ({ index }))
      return { items: all, offsetTop: 0, totalHeight: count * estimate, onScroll, reset }
    }
    const height = viewport || estimate * 12
    const start = Math.max(0, Math.floor(scrollTop / estimate) - overscan)
    const visible = Math.ceil(height / estimate) + overscan * 2
    const end = Math.min(count, start + visible)
    const items = Array.from({ length: Math.max(0, end - start) }, (_, offset) => ({ index: start + offset }))
    return { items, offsetTop: start * estimate, totalHeight: count * estimate, onScroll, reset }
  }, [count, estimate, overscan, enabled, scrollTop, viewport, onScroll, reset])
}
