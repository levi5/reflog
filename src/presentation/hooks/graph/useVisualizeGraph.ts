import { graphAnimUseCase, graphLayoutUseCase } from "../../../data"
import { useDeferredValue, useMemo } from "react"
import { computeCanvasGeometry } from "../../components/Graph"
import type { CanvasGraphLayout } from "../../../domain/entities/graph/graph-layout"
import type { CanvasGeometry, VisualizeGraph } from "../../../types/components/graph"
import type { CommitInfo } from "../../../types"
import type { SearchScope } from "../../context"
import { commitMatchesQuery, normalizeCommitQuery } from "../commit/commit-search"

const NO_DIMMED_COMMITS: ReadonlySet<string> = new Set<string>()
const NO_MATCHED_HASHES: string[] = []

interface UseVisualizeGraphOptions {
  graph: CommitInfo[]
  query: string
  scope: SearchScope
  selectedHash: string
}

export function useVisualizeGraph({ graph, query, scope, selectedHash }: UseVisualizeGraphOptions): VisualizeGraph {
  const deferredGraph = useDeferredValue(graph)
  const layout: CanvasGraphLayout = useMemo(() => graphLayoutUseCase.layoutGraph(deferredGraph), [deferredGraph])
  const geometry: CanvasGeometry = useMemo(() => computeCanvasGeometry(layout), [layout])
  const currentHeadHash = useMemo(() => graphAnimUseCase.headHash(graph), [graph])
  const normalizedQuery = useMemo(() => normalizeCommitQuery(query, scope), [query, scope])
  const dimmedHashes = useMemo(() => {
    if (!normalizedQuery) return NO_DIMMED_COMMITS
    return new Set(graph.filter((commit) => !commitMatchesQuery(commit, normalizedQuery)).map((commit) => commit.hash))
  }, [graph, normalizedQuery])
  const matchedHashes = useMemo(() => {
    if (!normalizedQuery) return NO_MATCHED_HASHES
    return graph.filter((commit) => commitMatchesQuery(commit, normalizedQuery)).map((commit) => commit.hash)
  }, [graph, normalizedQuery])
  const selectedCommit = useMemo(
    () => graph.find((commit) => commit.hash === selectedHash) ?? null,
    [graph, selectedHash],
  )

  return {
    layout,
    geometry,
    headHash: currentHeadHash,
    dimmedHashes,
    matchedHashes,
    selectedCommit,
  }
}
