import { useCallback, useEffect, useState } from "react"

interface PaginatedOptions<T> {
  repo: string
  step: number
  load: (repo: string, limit: number) => Promise<T[]>
  onError: (message: string) => void
}

export function usePaginated<T>({ repo, step, load, onError }: PaginatedOptions<T>) {
  const [items, setItems] = useState<T[]>([])
  const [limit, setLimit] = useState(step)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset pagination when switching repos, even though repo isn't read in the body
  useEffect(() => {
    setLimit(step)
    setHasMore(true)
  }, [repo, step])

  const loadMore = useCallback(async () => {
    if (!repo || loading || !hasMore) return
    setLoading(true)
    try {
      const nextLimit = limit + step
      const nextItems = await load(repo, nextLimit)
      setItems(nextItems)
      setLimit(nextLimit)
      setHasMore(nextItems.length >= nextLimit)
    } catch (error: unknown) {
      onError(String(error))
    } finally {
      setLoading(false)
    }
  }, [repo, limit, loading, hasMore, step, load, onError])

  return {
    items,
    setItems,
    limit,
    loading,
    hasMore,
    setHasMore,
    loadMore,
  }
}
