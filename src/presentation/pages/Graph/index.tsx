import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { mergeStatsUseCase } from "../../../data"

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
import { useAmendCommit } from "../../hooks/repository/useHistorySearch"
import { useBisect } from "../../hooks/repository/useBisect"
import { useRepo, useSearch, useSettingsContext } from "../../context"
import type { CommitInfo, ReflogEntry } from "../../../types"

import { BisectPanel } from "./BisectPanel"
import { COMMITS_PER_PAGE, useCommitFeed } from "./useCommitFeed"
import { useCommitSelection } from "./useCommitSelection"
import { ViewToggle, type GraphViewMode } from "./ViewToggle"
import styles from "./style.module.scss"

type Props = Record<string, never>

const VIEW_TITLE_KEY = {
  reflog: "reflogView",
  log: "logView",
  graph: "logGraph",
} as const

export function Graph(_props: Props) {
  const { lang } = useSettingsContext()
  const repo = useRepo()
  const { query, scope } = useSearch()
  const [searchParams, setSearchParams] = useSearchParams()
  const [viewMode, setViewMode] = useState<GraphViewMode>("graph")

  const hashParam = searchParams.get("hash")
  const { selectedCommit, select, dismiss } = useCommitSelection({
    hashParam,
    log: repo.log,
    graph: repo.graph,
  })

  const setHashParam = useCallback(
    (hash: string | null) => {
      setSearchParams((previous) => {
        const next = new URLSearchParams(previous)
        if (hash) next.set("hash", hash)
        else next.delete("hash")
        return next
      })
    },
    [setSearchParams],
  )

  const handleSelectCommit = useCallback(
    (commit: CommitInfo) => {
      select(commit)
      setHashParam(commit.hash)
    },
    [select, setHashParam],
  )

  const handleCloseDetails = useCallback(() => {
    dismiss()
    setHashParam(null)
  }, [dismiss, setHashParam])

  const feed = useCommitFeed({
    source: {
      log: repo.log,
      graph: repo.graph,
      reflog: repo.reflog,
      logHasMore: repo.logHasMore,
      graphHasMore: repo.graphHasMore,
      logLoading: repo.logLoading,
      graphLoading: repo.graphLoading,
      totalCommits: repo.totalCommits,
      reflogLoaded: repo.reflogLoaded,
      reflogLoading: repo.reflogLoading,
      loadMoreLog: repo.loadMoreLog,
      loadMoreGraph: repo.loadMoreGraph,
      loadReflog: repo.loadReflog,
    },
    viewMode,
    repoPath: repo.repo,
    query,
    scope,
    searchHistory: repo.searchHistory,
  })

  const amend = useAmendCommit({
    lang,
    headHash: repo.status?.head ?? "",
    repoPath: repo.repo,
    branch: repo.status?.branch ?? "",
    amendCommit: repo.amendCommit,
    setMsg: repo.setMsg,
  })
  const bisect = useBisect({ lang, repo: repo.repo, runAction: repo.runAction })

  const handleReflogSelect = useCallback(
    (entry: ReflogEntry) =>
      select({
        hash: entry.hash,
        short: entry.short,
        author: entry.author,
        date: entry.date,
        message: entry.action,
        parents: [],
        refs: [],
      }),
    [select],
  )

  useEffect(() => {
    if (repo.status?.bisecting) void bisect.loadLog()
  }, [repo.status?.bisecting, bisect.loadLog])

  const isBisecting = repo.status?.bisecting === true
  const visibleBranches = useMemo(
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
            onSearch={feed.handleServerSearch}
            onClear={feed.clearServerSearch}
            active={feed.search.filter !== null}
            busy={feed.search.busy}
            resultCount={feed.search.results.length}
          />
          {feed.search.error && (
            <p className={styles.searchError} role="alert" data-testid="history-search-error">
              {feed.search.error}
            </p>
          )}
          <Branch.Panel
            branches={visibleBranches}
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
            <ViewToggle lang={lang} viewMode={viewMode} onChange={setViewMode} />
            <BisectPanel
              lang={lang}
              isBisecting={isBisecting}
              busy={repo.busy}
              log={bisect.log}
              start={bisect.start}
              mark={bisect.mark}
              skip={bisect.skip}
              reset={bisect.reset}
              loadLog={bisect.loadLog}
            />
            <h3>{t(lang, VIEW_TITLE_KEY[viewMode])}</h3>
            {viewMode === "reflog" ? (
              <Commit.Reflog
                entries={feed.reflog}
                selectedHash={selectedCommit?.hash}
                onSelect={handleReflogSelect}
                onCheckout={(hash) => void repo.checkoutBranch(hash)}
                onReset={(hash, mode) => void repo.resetBranch(hash, mode)}
                onCherryPick={(hash) => void repo.cherryPick(hash)}
              />
            ) : (
              <>
                {feed.commits.length === 0 && (feed.pagination.loading || repo.reflogLoading) ? (
                  <Skeleton.Commits count={COMMITS_PER_PAGE} label={t(lang, "loading")} />
                ) : (
                  <Commit.List
                    commits={feed.commits}
                    currentBranchName={repo.status?.branch ?? ""}
                    showGraph={viewMode === "graph"}
                    headHash={repo.status?.head ?? ""}
                    selectedHash={selectedCommit?.hash}
                    query={query}
                    onSelect={handleSelectCommit}
                    onAmend={amend.handleAmend}
                  />
                )}
                <Pagination
                  currentPage={feed.page}
                  totalItems={feed.pagination.totalItems}
                  pageSize={COMMITS_PER_PAGE}
                  hasMore={feed.pagination.hasMore}
                  totalKnown={feed.pagination.totalKnown}
                  loading={feed.pagination.loading}
                  onPageChange={feed.handlePageChange}
                />
                <div ref={feed.observeLoadMore} />
              </>
            )}
            {amend.amendCommit && (
              <Modal
                title={t(lang, "amendCommit")}
                onClose={amend.cancelAmend}
                actions={
                  <>
                    <button type="button" onClick={amend.cancelAmend}>
                      {t(lang, "cancel")}
                    </button>
                    <button
                      type="button"
                      className="primary"
                      onClick={amend.confirmAmend}
                      disabled={!amend.amendApi.canCommit}
                    >
                      {t(lang, "saveChanges")}
                    </button>
                  </>
                }
              >
                <Commit.Form api={amend.amendApi} compact />
                {amend.amendApi.formatted.trim() && (
                  <pre className={styles.amendPreview}>{amend.amendApi.formatted}</pre>
                )}
              </Modal>
            )}
          </Flex.Col>
          {selectedCommit && (
            <Commit.DetailModal
              commit={selectedCommit}
              onClose={handleCloseDetails}
              storageKey="graph.detail"
              onCherryPick={repo.cherryPick}
              onRevert={repo.revert}
              onReset={repo.resetBranch}
              onCheckout={(hash) => repo.checkoutBranch(hash)}
              loadFiles={repo.loadCommitFiles}
              loadDiff={repo.loadCommitDiff}
            />
          )}
        </Flex.Row>
      }
    />
  )
}
