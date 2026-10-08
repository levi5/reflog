import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { mergeStatsUseCase } from "../../../data"
import type { CommitInfo, ReflogEntry } from "../../../types"
import { useIntersectionObserver } from "../../hooks"
import { useHistorySearch } from "../../hooks/repository/useHistorySearch"
import type { LogFilter } from "../../../infrastructure/git/ipc-client"
import type { GraphViewMode } from "./ViewToggle"

export const COMMITS_PER_PAGE = 10

export interface CommitFeedSource {
  log: CommitInfo[]
  graph: CommitInfo[]
  reflog: ReflogEntry[]
  logHasMore: boolean
  graphHasMore: boolean
  logLoading: boolean
  graphLoading: boolean
  totalCommits: number | null
  reflogLoaded: boolean
  reflogLoading: boolean
  loadMoreLog: () => void
  loadMoreGraph: () => void
  loadReflog: () => void
}

interface CommitFeedOptions {
  source: CommitFeedSource
  viewMode: GraphViewMode
  repoPath: string
  query: string
  scope: string
  searchHistory: (filter: LogFilter, view: "log" | "graph", limit?: number) => Promise<CommitInfo[]>
}

function matchesCommit(commit: CommitInfo, query: string): boolean {
  return [commit.message, commit.author, commit.short, commit.hash].some((value) =>
    mergeStatsUseCase.matchesQuery(value, query),
  )
}

function matchesReflog(entry: ReflogEntry, query: string): boolean {
  return [entry.action, entry.author, entry.short, entry.hash, entry.selector].some((value) =>
    mergeStatsUseCase.matchesQuery(value, query),
  )
}

export function useCommitFeed({ source, viewMode, repoPath, query, scope, searchHistory }: CommitFeedOptions) {
  const [page, setPage] = useState(0)
  const resetPage = useCallback(() => setPage(0), [])
  const { searchFilter, searchResults, searchBusy, searchError, handleServerSearch, clearServerSearch } =
    useHistorySearch({ repoRoot: repoPath, viewMode, searchHistory, onSearchStart: resetPage })
  const [feedScope, setFeedScope] = useState(() => [viewMode, repoPath, query, scope])

  if (feedScope[0] !== viewMode || feedScope[1] !== repoPath || feedScope[2] !== query || feedScope[3] !== scope) {
    setFeedScope([viewMode, repoPath, query, scope])
    setPage(0)
  }

  const hasMore = viewMode === "log" ? source.logHasMore : source.graphHasMore
  const loading = viewMode === "log" ? source.logLoading : source.graphLoading
  const availableCount = viewMode === "log" ? source.log.length : source.graph.length
  const availableCommits = viewMode === "log" ? source.log : source.graph
  const ignoresQuery = scope === "branches" || scope === "files"

  useEffect(() => {
    if (viewMode === "reflog") {
      if (!source.reflogLoaded && !source.reflogLoading) void source.loadReflog()
      return
    }
    if (availableCount === 0 && !loading) {
      if (viewMode === "log") source.loadMoreLog()
      else source.loadMoreGraph()
    }
  }, [
    viewMode,
    availableCount,
    loading,
    source.reflogLoaded,
    source.reflogLoading,
    source.loadMoreLog,
    source.loadMoreGraph,
    source.loadReflog,
  ])

  const loadMore = useCallback(() => {
    if (viewMode === "log") source.loadMoreLog()
    else source.loadMoreGraph()
  }, [viewMode, source.loadMoreLog, source.loadMoreGraph])

  const filteredCommits = useMemo(() => {
    if (searchFilter !== null) {
      return ignoresQuery ? searchResults : searchResults.filter((commit) => matchesCommit(commit, query))
    }
    return ignoresQuery ? availableCommits : availableCommits.filter((commit) => matchesCommit(commit, query))
  }, [availableCommits, query, ignoresQuery, searchFilter, searchResults])

  const filteredReflog = useMemo(() => {
    return ignoresQuery ? source.reflog : source.reflog.filter((entry) => matchesReflog(entry, query))
  }, [source.reflog, query, ignoresQuery])

  const loadMoreRef = useRef(loadMore)
  useEffect(() => {
    loadMoreRef.current = loadMore
  }, [loadMore])

  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage)
      const preloadThreshold = (newPage + 2) * COMMITS_PER_PAGE
      if (searchFilter !== null) return
      if (preloadThreshold >= availableCount && hasMore && !loading) loadMoreRef.current()
    },
    [availableCount, hasMore, loading, searchFilter],
  )

  useEffect(() => {
    if (searchFilter !== null) return
    const isNearEnd = (page + 2) * COMMITS_PER_PAGE >= availableCount
    if (isNearEnd && hasMore && !loading && availableCount > 0) loadMoreRef.current()
  }, [page, availableCount, hasMore, loading, searchFilter])

  const observeLoadMore = useIntersectionObserver<HTMLDivElement>(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadMoreRef.current()
    },
    { threshold: 0.5, enabled: viewMode !== "reflog" && searchFilter === null },
  )

  const isUnfiltered = query.trim() === "" && searchFilter === null
  const totalKnown = isUnfiltered && source.totalCommits != null
  const isSeeking = searchFilter === null && hasMore && page * COMMITS_PER_PAGE >= availableCount

  return {
    commits: filteredCommits.slice(page * COMMITS_PER_PAGE, (page + 1) * COMMITS_PER_PAGE),
    reflog: filteredReflog,
    page,
    handlePageChange,
    observeLoadMore,
    search: { filter: searchFilter, results: searchResults, busy: searchBusy, error: searchError },
    handleServerSearch,
    clearServerSearch,
    pagination: {
      totalItems: totalKnown ? (source.totalCommits as number) : filteredCommits.length,
      hasMore,
      totalKnown,
      loading: loading || isSeeking || searchBusy,
    },
  }
}
