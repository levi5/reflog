import { useCallback, useRef, useState } from "react"
import type { CommitInfo, Lang } from "../../../types"
import type { LogFilter } from "../../../infrastructure/git/ipc-client"
import { t } from "../../../i18n"
import { commitTemplateUseCase } from "../../../data"
import { useCommitTemplate } from "../../hooks"

interface HistorySearchDeps {
  repoRoot: string
  viewMode: "graph" | "log" | "reflog"
  searchHistory: (filter: LogFilter, view: "log" | "graph", limit?: number) => Promise<CommitInfo[]>
  onSearchStart: () => void
}

export function useHistorySearch({ repoRoot, viewMode, searchHistory, onSearchStart }: HistorySearchDeps) {
  const [searchFilter, setSearchFilter] = useState<LogFilter | null>(null)
  const [searchResults, setSearchResults] = useState<CommitInfo[]>([])
  const [searchBusy, setSearchBusy] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const searchRequestRef = useRef(0)

  const runServerSearch = useCallback(
    async (filter: LogFilter) => {
      if (!repoRoot) return
      const request = searchRequestRef.current + 1
      searchRequestRef.current = request
      setSearchBusy(true)
      setSearchError(null)
      try {
        const results = await searchHistory(filter, viewMode === "graph" ? "graph" : "log", 200)
        if (searchRequestRef.current !== request) return
        setSearchResults(results)
      } catch (error) {
        if (searchRequestRef.current !== request) return
        setSearchError(String(error))
        setSearchResults([])
      } finally {
        if (searchRequestRef.current === request) setSearchBusy(false)
      }
    },
    [repoRoot, searchHistory, viewMode],
  )

  const handleServerSearch = useCallback(
    (filter: LogFilter) => {
      setSearchFilter(filter)
      onSearchStart()
      void runServerSearch(filter)
    },
    [onSearchStart, runServerSearch],
  )

  const clearServerSearch = useCallback(() => {
    searchRequestRef.current += 1
    setSearchFilter(null)
    setSearchResults([])
    setSearchError(null)
    setSearchBusy(false)
  }, [])

  return { searchFilter, searchResults, searchBusy, searchError, handleServerSearch, clearServerSearch }
}

interface AmendCommitDeps {
  lang: Lang
  headHash: string
  repoPath: string
  branch: string
  amendCommit: (repoPath: string, message: string, signoff?: boolean, sign?: boolean) => Promise<unknown> | undefined
  setMsg: (message: string) => void
}

export function useAmendCommit({ lang, headHash, repoPath, branch, amendCommit, setMsg }: AmendCommitDeps) {
  const [amendCommitTarget, setAmendCommitTarget] = useState<CommitInfo | null>(null)
  const [amendMessage, setAmendMessage] = useState("")
  const amendApi = useCommitTemplate({
    value: amendMessage,
    onChange: setAmendMessage,
    repoPath,
    branch,
  })

  const cancelAmend = useCallback(() => {
    setAmendCommitTarget(null)
    setAmendMessage("")
  }, [])

  const handleAmend = useCallback(
    (commit: CommitInfo) => {
      if (!headHash || commit.hash !== headHash) {
        setMsg(t(lang, "amendHeadOnly"))
        return
      }
      setAmendCommitTarget(commit)
      setAmendMessage(commit.message)
    },
    [headHash, lang, setMsg],
  )

  const confirmAmend = useCallback(async () => {
    const message = amendMessage.trim()
    if (!amendCommitTarget || !message || !amendApi.canCommit) return
    if (!headHash || amendCommitTarget.hash !== headHash) {
      setMsg(t(lang, "amendHeadOnly"))
      cancelAmend()
      return
    }

    const { signoff, sign } = amendApi.fields
    try {
      await amendCommit(repoPath, message, signoff, sign)
      commitTemplateUseCase.pushHistory(message)
      cancelAmend()
    } catch (error) {
      setMsg(String(error))
    }
  }, [amendApi, amendCommit, amendCommitTarget, amendMessage, cancelAmend, headHash, lang, repoPath, setMsg])

  return {
    amendCommit: amendCommitTarget,
    amendMessage,
    setAmendMessage,
    amendApi,
    handleAmend,
    confirmAmend,
    cancelAmend,
  }
}
