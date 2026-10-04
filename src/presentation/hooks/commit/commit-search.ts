import { mergeStatsUseCase } from "../../../data"
import type { CommitInfo } from "../../../types"
import type { SearchScope } from "../../context"

const SCOPES_WITHOUT_COMMIT_FILTER: ReadonlySet<SearchScope> = new Set<SearchScope>(["branches", "files"])

export function normalizeCommitQuery(query: string, scope: SearchScope): string {
  if (SCOPES_WITHOUT_COMMIT_FILTER.has(scope)) return ""
  return query.trim().toLowerCase()
}

export function commitMatchesQuery(commit: CommitInfo, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true
  return (
    mergeStatsUseCase.matchesQuery(commit.message, normalizedQuery) ||
    mergeStatsUseCase.matchesQuery(commit.author, normalizedQuery) ||
    mergeStatsUseCase.matchesQuery(commit.short, normalizedQuery) ||
    commit.hash.toLowerCase().startsWith(normalizedQuery)
  )
}
