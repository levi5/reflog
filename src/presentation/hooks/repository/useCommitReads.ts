import { useCallback } from "react"
import type { IGitApi } from "../../../infrastructure/git/types"
import type { LogFilter } from "../../../infrastructure/git/ipc-client"
import type { CommitFileChange, CommitInfo } from "../../../types"
import type { CompareRefsResult } from "./useRepository"

interface CommitReadsOptions {
  repo: string
  git: IGitApi
}

const EMPTY_COMPARE = (base: string, target: string): CompareRefsResult => ({
  base,
  target,
  mergeBase: "",
  files: [],
  ahead: [],
  behind: [],
  diff: "",
})

export function useCommitReads({ repo, git }: CommitReadsOptions) {
  const loadCommitFiles = useCallback(
    (hash: string): Promise<CommitFileChange[]> => (repo && hash ? git.commitFiles(repo, hash) : Promise.resolve([])),
    [repo, git],
  )

  const loadCommitDiff = useCallback(
    (hash: string, file?: string) => (repo && hash ? git.commitDiff(repo, hash, file) : Promise.resolve("")),
    [repo, git],
  )

  const compareRefs = useCallback(
    async (base: string, target: string): Promise<CompareRefsResult> => {
      if (!repo) return EMPTY_COMPARE(base, target)
      const mergeBase = await git.mergeBase(repo, base, target)
      const [files, ahead, behind, diff] = await Promise.all([
        git.diffStatFiles(repo, base, target),
        git.commitsAhead(repo, base, target, 100),
        git.commitsBehind(repo, base, target, 100),
        git.diffRefs(repo, base, target, false),
      ])
      return { base, target, mergeBase, files, ahead, behind, diff }
    },
    [repo, git],
  )

  const searchHistory = useCallback(
    async (filter: LogFilter, view: "log" | "graph", limit = 100): Promise<CommitInfo[]> => {
      if (!repo) return []
      return view === "graph" ? git.searchGraph(repo, filter, limit) : git.searchLog(repo, filter, limit)
    },
    [repo, git],
  )

  return { loadCommitFiles, loadCommitDiff, compareRefs, searchHistory }
}
