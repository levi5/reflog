import { useCallback, useEffect, useEffectEvent, useRef } from "react"

interface IntersectionObserverOptions extends IntersectionObserverInit {
  enabled?: boolean
}

export function useIntersectionObserver<T extends Element>(
  onIntersect: (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => void,
  { enabled = true, root = null, rootMargin = "0px", threshold = 0 }: IntersectionObserverOptions = {},
) {
  const observerRef = useRef<IntersectionObserver | null>(null)
  const targetsRef = useRef<Set<T>>(new Set())
  const onIntersectEvent = useEffectEvent(onIntersect)

  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver(
      (entries, currentObserver) => onIntersectEvent(entries, currentObserver),
      {
        root,
        rootMargin,
        threshold,
      },
    )
    observerRef.current = observer
    targetsRef.current.forEach((target) => {
      observer.observe(target)
    })
    return () => {
      observer.disconnect()
      observerRef.current = null
    }
  }, [enabled, root, rootMargin, threshold])

  return useCallback((target: T | null) => {
    if (!target || targetsRef.current.has(target)) return
    targetsRef.current.add(target)
    observerRef.current?.observe(target)
  }, [])
}
