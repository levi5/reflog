import { useCallback, useEffect, useRef, useState } from "react"

interface PaginatedOptions<T> {
  repo: string
  step: number
  load: (repo: string, limit: number) => Promise<T[]>
  onError: (message: string) => void
}

export function usePaginated<T>({ repo, step, load, onError }: PaginatedOptions<T>) {
  const [items, setItems] = useState<T[]>([])
  const [limit, setLimit] = useState(0)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const loadingRef = useRef(false)
  const limitRef = useRef(0)
  const hasMoreRef = useRef(true)
  const requestRef = useRef(0)

  const reset = useCallback(() => {
    requestRef.current += 1
    loadingRef.current = false
    limitRef.current = 0
    hasMoreRef.current = true
    setItems([])
    setLimit(0)
    setHasMore(true)
    setLoading(false)
  }, [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset pagination when switching repos, even though repo isn't read in the body
  useEffect(() => {
    reset()
  }, [repo, step, reset])

  const loadMore = useCallback(async () => {
    if (!repo || loadingRef.current || !hasMoreRef.current) return
    const request = requestRef.current + 1
    requestRef.current = request
    loadingRef.current = true
    setLoading(true)
    try {
      const nextLimit = limitRef.current + step
      const nextItems = await load(repo, nextLimit)
      if (request !== requestRef.current) return
      const nextHasMore = nextItems.length >= nextLimit
      limitRef.current = nextLimit
      hasMoreRef.current = nextHasMore
      setItems(nextItems)
      setLimit(nextLimit)
      setHasMore(nextHasMore)
    } catch (error: unknown) {
      if (request === requestRef.current) onError(String(error))
    } finally {
      if (request === requestRef.current) {
        loadingRef.current = false
        setLoading(false)
      }
    }
  }, [repo, step, load, onError])

  return {
    items,
    setItems,
    limit,
    loading,
    hasMore,
    setHasMore,
    loadMore,
    reset,
  }
}
