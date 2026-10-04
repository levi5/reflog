import { mergeStatsUseCase } from "../../../data"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import classnames from "classnames"
import { _try } from "funcio"
import { GitBranch, History, List } from "lucide-react"

import { Branch } from "../../components/Branch"
import { Commit } from "../../components/Commit"
import { Flex } from "@/presentation/components/Wrapper/Flex"
import { Modal } from "../../components/Modal"
import { Pagination } from "../../components/Pagination"
import { ResizableSplitLayout } from "../../components/Resizable"
import { SearchBox } from "../../components/Search"
import { HistorySearchPanel } from "../../components/Graph"
import { Skeleton } from "../../components/Skeleton"

import { t } from "../../../i18n"
import { useIntersectionObserver } from "../../hooks"
import { useAmendCommit, useHistorySearch } from "../../hooks/repository/useHistorySearch"
import { useRepo, useSearch, useSettingsContext } from "../../context"
import type { CommitInfo } from "../../../types"

import styles from "./style.module.scss"

type Props = Record<string, never>
const COMMITS_PER_PAGE = 10

export function Graph(_props: Props) {
  const { lang } = useSettingsContext()
  const repo = useRepo()
  const { query, scope } = useSearch()
  const [searchParams, setSearchParams] = useSearchParams()
  const [viewMode, setViewMode] = useState<"graph" | "log" | "reflog">("graph")
  const [selectedCommit, setSelectedCommit] = useState<CommitInfo | null>(null)
  const [commitPage, setCommitPage] = useState(0)
  const dismissedCommitHashRef = useRef("")
  const headHash = repo.status?.head ?? ""

  const amend = useAmendCommit({
    lang,
    headHash,
    repoPath: repo.repo,
    branch: repo.status?.branch ?? "",
    amendCommit: repo.amendCommit,
    setMsg: repo.setMsg,
  })
  const { amendCommit, amendApi, handleAmend, confirmAmend, cancelAmend } = amend

  const handleCheckout = useCallback((hash: string) => void repo.checkoutBranch(hash), [repo.checkoutBranch])
  const handleReset = useCallback(
    (hash: string, mode: "soft" | "mixed" | "hard") => void repo.resetBranch(hash, mode),
    [repo.resetBranch],
  )
  const handleCherryPick = useCallback((hash: string) => void repo.cherryPick(hash), [repo.cherryPick])

  const handleSelectCommit = useCallback(
    (commit: CommitInfo) => {
      dismissedCommitHashRef.current = ""
      setSelectedCommit(commit)
      setSearchParams((prev) => {
        const nextSearchParams = new URLSearchParams(prev)
        if (commit?.hash) nextSearchParams.set("hash", commit.hash)
        else nextSearchParams.delete("hash")
        return nextSearchParams
      })
    },
    [setSearchParams],
  )

  const repoPath = repo.repo

  const currentHasMore = viewMode === "log" ? repo.logHasMore : repo.graphHasMore
  const currentLoading = viewMode === "log" ? repo.logLoading : repo.graphLoading
  const activeCommitLoading = viewMode === "log" ? repo.logLoading : repo.graphLoading
  const availableCommitCount = viewMode === "log" ? repo.log.length : repo.graph.length

  useEffect(() => {
    if (viewMode === "reflog") {
      if (!repo.reflogLoaded && !repo.reflogLoading) void repo.loadReflog()
      return
    }

    if (availableCommitCount === 0 && !activeCommitLoading) {
      if (viewMode === "log") void repo.loadMoreLog()
      else void repo.loadMoreGraph()
    }
  }, [
    viewMode,
    availableCommitCount,
    activeCommitLoading,
    repo.reflogLoaded,
    repo.reflogLoading,
    repo.loadMoreLog,
    repo.loadMoreGraph,
    repo.loadReflog,
  ])

  const resetCommitPage = useCallback(() => setCommitPage(0), [])

  const { searchFilter, searchResults, searchBusy, searchError, handleServerSearch, clearServerSearch } =
    useHistorySearch({
      repoRoot: repo.repo,
      viewMode,
      searchHistory: repo.searchHistory,
      onSearchStart: resetCommitPage,
    })

  const handleLoadMore = useCallback(() => {
    const method = viewMode === "log" ? "loadMoreLog" : "loadMoreGraph"

    _try.sync(() => repo[method]())
  }, [viewMode, repo])

  const handleLoadMoreRef = useRef(handleLoadMore)
  useEffect(() => {
    handleLoadMoreRef.current = handleLoadMore
  }, [handleLoadMore])

  // biome-ignore lint/correctness/useExhaustiveDependencies: switching view, repo, scope or query must reset pagination
  useEffect(() => {
    setCommitPage(0)
  }, [viewMode, repoPath, query, scope])

  const filteredCommits = useMemo(() => {
    const availableCommits = viewMode === "log" ? repo.log : repo.graph
    if (searchFilter !== null) {
      if (scope === "branches" || scope === "files") return searchResults
      return searchResults.filter((commit) =>
        [commit.message, commit.author, commit.short, commit.hash].some((value) =>
          mergeStatsUseCase.matchesQuery(value, query),
        ),
      )
    }
    if (scope === "branches" || scope === "files") return availableCommits
    return availableCommits.filter((commit) =>
      [commit.message, commit.author, commit.short, commit.hash].some((value) =>
        mergeStatsUseCase.matchesQuery(value, query),
      ),
    )
  }, [repo.log, repo.graph, query, scope, viewMode, searchFilter, searchResults])
  const filteredReflog = useMemo(() => {
    if (scope === "branches" || scope === "files") return repo.reflog
    return repo.reflog.filter((entry) =>
      [entry.action, entry.author, entry.short, entry.hash, entry.selector].some((value) =>
        mergeStatsUseCase.matchesQuery(value, query),
      ),
    )
  }, [repo.reflog, query, scope])

  const handlePageChange = (newPage: number) => {
    setCommitPage(newPage)
    const preloadThreshold = (newPage + 2) * COMMITS_PER_PAGE
    if (searchFilter !== null) return
    if (preloadThreshold >= availableCommitCount && currentHasMore && !currentLoading) {
      handleLoadMore()
    }
  }

  useEffect(() => {
    if (searchFilter !== null) return
    const isNearEnd = (commitPage + 2) * COMMITS_PER_PAGE >= availableCommitCount
    if (isNearEnd && currentHasMore && !currentLoading && availableCommitCount > 0) {
      handleLoadMoreRef.current()
    }
  }, [commitPage, availableCommitCount, currentHasMore, currentLoading, searchFilter])

  const observeLoadMore = useIntersectionObserver<HTMLDivElement>(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) handleLoadMoreRef.current()
    },
    { threshold: 0.5, enabled: viewMode !== "reflog" && searchFilter === null },
  )

  const isUnfiltered = query.trim() === "" && searchFilter === null
  const totalKnown = isUnfiltered && repo.totalCommits != null
  const paginationTotal = totalKnown ? (repo.totalCommits as number) : filteredCommits.length

  const commits = filteredCommits.slice(commitPage * COMMITS_PER_PAGE, (commitPage + 1) * COMMITS_PER_PAGE)
  const isSeeking = searchFilter === null && currentHasMore && commitPage * COMMITS_PER_PAGE >= availableCommitCount
  const paginationLoading = currentLoading || isSeeking || searchBusy
  const hashParam = searchParams.get("hash")
  const logCommits = repo.log
  const graphCommits = repo.graph
  const selectedHash = selectedCommit?.hash
  useEffect(() => {
    if (!hashParam) {
      dismissedCommitHashRef.current = ""
      return
    }
    if (dismissedCommitHashRef.current === hashParam || selectedHash === hashParam) return
    const found =
      logCommits.find((commit) => commit.hash === hashParam || commit.short === hashParam) ??
      graphCommits.find((commit) => commit.hash === hashParam || commit.short === hashParam)
    if (found) setSelectedCommit(found)
  }, [hashParam, logCommits, graphCommits, selectedHash])
  const branches = useMemo(
    () =>
      scope === "commits" || scope === "files"
        ? repo.branches
        : repo.branches.filter((branch) => mergeStatsUseCase.matchesQuery(branch.name, query)),
    [repo.branches, query, scope],
  )

  return (
    <ResizableSplitLayout
      sidebarWidth={{ initial: 300, min: 220, max: 560, storageKey: "graph.side", label: t(lang, "resizeSidebar") }}
      sidebar={
        <>
          <div className={styles.sideHead}>
            <strong style={{ textTransform: "uppercase" }}>{t(lang, "branches")}</strong>
          </div>
          <SearchBox placeholder={t(lang, "searchPh")} />
          <HistorySearchPanel
            onSearch={handleServerSearch}
            onClear={clearServerSearch}
            active={searchFilter !== null}
            busy={searchBusy}
            resultCount={searchResults.length}
          />
          {searchError && (
            <p className={styles.searchError} role="alert" data-testid="history-search-error">
              {searchError}
            </p>
          )}
          <Branch.Panel
            branches={branches}
            currentBranchName={repo.status?.branch ?? ""}
            newBranchName={repo.newBranch}
            onNewBranchNameChange={repo.setNewBranch}
            onCreateBranch={repo.createBranch}
            onCheckoutBranch={repo.checkoutBranch}
            onDeleteBranch={repo.deleteBranch}
            onRenameBranch={repo.renameBranch}
            onCreateBranchFrom={repo.createBranchFrom}
          />
        </>
      }
      main={
        <Flex.Row className={styles.wrapperMain}>
          <Flex.Col grow={1} className={styles.wrapperCommits}>
            <div className={styles.viewToggle}>
              <button
                type="button"
                className={classnames(styles.toggleBtn, viewMode === "log" && styles.active)}
                aria-pressed={viewMode === "log"}
                onClick={() => setViewMode("log")}
              >
                <List size={14} />
                <span>{t(lang, "logView")}</span>
              </button>
              <button
                type="button"
                className={classnames(styles.toggleBtn, viewMode === "graph" && styles.active)}
                aria-pressed={viewMode === "graph"}
                onClick={() => setViewMode("graph")}
              >
                <GitBranch size={14} />
                <span>{t(lang, "graphView")}</span>
              </button>
              <button
                type="button"
                className={classnames(styles.toggleBtn, viewMode === "reflog" && styles.active)}
                aria-pressed={viewMode === "reflog"}
                onClick={() => setViewMode("reflog")}
              >
                <History size={14} />
                <span>{t(lang, "reflog")}</span>
              </button>
            </div>
            <h3>{t(lang, viewMode === "reflog" ? "reflogView" : viewMode === "log" ? "logView" : "logGraph")}</h3>
            {viewMode === "reflog" ? (
              <Commit.Reflog
                entries={filteredReflog}
                selectedHash={selectedCommit?.hash}
                onSelect={(entry) =>
                  setSelectedCommit({
                    hash: entry.hash,
                    short: entry.short,
                    author: entry.author,
                    date: entry.date,
                    message: entry.action,
                    parents: [],
                    refs: [],
                  })
                }
                onCheckout={handleCheckout}
                onReset={handleReset}
                onCherryPick={handleCherryPick}
              />
            ) : (
              <>
                {commits.length === 0 && (paginationLoading || repo.reflogLoading) ? (
                  <Skeleton.Commits count={COMMITS_PER_PAGE} label={t(lang, "loading")} />
                ) : (
                  <Commit.List
                    commits={commits}
                    currentBranchName={repo.status?.branch ?? ""}
                    showGraph={viewMode === "graph"}
                    headHash={headHash}
                    selectedHash={selectedCommit?.hash}
                    query={query}
                    onSelect={handleSelectCommit}
                    onAmend={handleAmend}
                  />
                )}
                <Pagination
                  currentPage={commitPage}
                  totalItems={paginationTotal}
                  pageSize={COMMITS_PER_PAGE}
                  hasMore={currentHasMore}
                  totalKnown={totalKnown}
                  loading={paginationLoading}
                  onPageChange={handlePageChange}
                />
                <div ref={observeLoadMore} />
              </>
            )}
            {amendCommit && (
              <Modal
                title={t(lang, "amendCommit")}
                onClose={cancelAmend}
                actions={
                  <>
                    <button type="button" onClick={cancelAmend}>
                      {t(lang, "cancel")}
                    </button>
                    <button type="button" className="primary" onClick={confirmAmend} disabled={!amendApi.canCommit}>
                      {t(lang, "saveChanges")}
                    </button>
                  </>
                }
              >
                <Commit.Form api={amendApi} compact />
                {amendApi.formatted.trim() && <pre className={styles.amendPreview}>{amendApi.formatted}</pre>}
              </Modal>
            )}
          </Flex.Col>
          {selectedCommit && (
            <Modal
              title={t(lang, "commitDetails")}
              size="lg"
              onClose={() => {
                dismissedCommitHashRef.current = selectedCommit.hash
                setSelectedCommit(null)
                setSearchParams((prev) => {
                  const nextSearchParams = new URLSearchParams(prev)
                  nextSearchParams.delete("hash")
                  return nextSearchParams
                })
              }}
            >
              <Commit.Detail
                commit={selectedCommit}
                expanded
                resizable={false}
                onCherryPick={repo.cherryPick}
                onRevert={repo.revert}
                onReset={repo.resetBranch}
                onCheckout={(hash) => repo.checkoutBranch(hash)}
                loadFiles={repo.loadCommitFiles}
                loadDiff={repo.loadCommitDiff}
              />
            </Modal>
          )}
        </Flex.Row>
      }
    />
  )
}
