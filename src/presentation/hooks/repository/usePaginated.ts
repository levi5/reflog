import { useCallback, useEffect, useRef, useState } from "react"

const LOAD_TIMEOUT_MS = 60_000

interface PaginatedOptions<T> {
  repo: string
  step: number
  load: (repo: string, limit: number, skip: number) => Promise<T[]>
  onError: (message: string) => void
  getId?: (item: T) => string
}

export function usePaginated<T>({ repo, step, load, onError, getId }: PaginatedOptions<T>) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const loadingRef = useRef(false)
  const hasMoreRef = useRef(true)
  const requestRef = useRef(0)
  const skipRef = useRef(0)
  const seenRef = useRef<Set<string>>(new Set())

  const reset = useCallback(() => {
    requestRef.current += 1
    loadingRef.current = false
    hasMoreRef.current = true
    skipRef.current = 0
    seenRef.current = new Set()
    setItems([])
    setHasMore(true)
    setLoading(false)
  }, [])

  useEffect(() => {
    void repo
    void step
    reset()
  }, [repo, step, reset])

  const loadMore = useCallback(async () => {
    if (!repo || loadingRef.current || !hasMoreRef.current) return
    const request = requestRef.current + 1
    requestRef.current = request
    loadingRef.current = true
    setLoading(true)

    let timeoutId: ReturnType<typeof setTimeout> | undefined
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("timeout")), LOAD_TIMEOUT_MS)
    })

    try {
      const skip = skipRef.current
      const nextItems = await Promise.race([load(repo, step, skip), timeoutPromise])
      if (request !== requestRef.current) return
      skipRef.current = skip + nextItems.length
      const nextHasMore = nextItems.length >= step
      hasMoreRef.current = nextHasMore
      if (getId) {
        const seen = seenRef.current
        const fresh = nextItems.filter((item) => {
          const id = getId(item)
          if (seen.has(id)) return false
          seen.add(id)
          return true
        })
        setItems((prev) => [...prev, ...fresh])
      } else {
        setItems((prev) => [...prev, ...nextItems])
      }
      setHasMore(nextHasMore)
    } catch (error: unknown) {
      if (request === requestRef.current) onError(String(error))
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId)
      if (request === requestRef.current) {
        loadingRef.current = false
        setLoading(false)
      }
    }
  }, [repo, step, load, onError, getId])

  return {
    items,
    setItems,
    loading,
    hasMore,
    setHasMore,
    loadMore,
    reset,
  }
}
