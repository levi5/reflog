import { useEffect, useMemo, useRef, useState } from "react"
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

import { matchesQuery, pushHistory } from "../../../main/adapters"
import { t } from "../../../i18n"
import { useCommitTemplate, useIntersectionObserver } from "../../hooks"
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
  const [amendCommit, setAmendCommit] = useState<CommitInfo | null>(null)
  const [amendMessage, setAmendMessage] = useState("")
  const [commitPage, setCommitPage] = useState(0)
  const amendApi = useCommitTemplate({
    value: amendMessage,
    onChange: setAmendMessage,
    repoPath: repo.repo,
    branch: repo.status?.branch ?? "",
  })

  const handleAmend = (commit: CommitInfo) => {
    setAmendCommit(commit)
    setAmendMessage(commit.message)
  }

  const confirmAmend = async () => {
    const msg = amendMessage.trim()

    if (!amendCommit || !msg || !amendApi.canCommit) return

    const { signoff, sign } = amendApi.fields

    const box = await _try.async(async () => {
      await repo.runAction(async () => {
        await repo.amendCommit?.(repo.repo, msg, signoff, sign)
      })

      pushHistory(msg)
      setAmendCommit(null)
      setAmendMessage("")
    })

    if (box.isLeft()) console.error("Amend failed:", box.value)
  }

  const cancelAmend = () => {
    setAmendCommit(null)
    setAmendMessage("")
  }

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

  const handleLoadMore = () => {
    const method = viewMode === "log" ? "loadMoreLog" : "loadMoreGraph"

    _try.sync(() => repo[method]())
  }

  const handleLoadMoreRef = useRef(handleLoadMore)
  handleLoadMoreRef.current = handleLoadMore

  const filteredCommits = useMemo(() => {
    const availableCommits = viewMode === "log" ? repo.log : repo.graph
    if (scope === "branches" || scope === "files") return availableCommits
    return availableCommits.filter((commit) =>
      [commit.message, commit.author, commit.short, commit.hash].some((value) => matchesQuery(value, query)),
    )
  }, [repo.log, repo.graph, query, scope, viewMode])
  const filteredReflog = useMemo(() => {
    if (scope === "branches" || scope === "files") return repo.reflog
    return repo.reflog.filter((entry) =>
      [entry.action, entry.author, entry.short, entry.hash, entry.selector].some((value) => matchesQuery(value, query)),
    )
  }, [repo.reflog, query, scope])

  const handlePageChange = (newPage: number) => {
    setCommitPage(newPage)
    const preloadThreshold = (newPage + 2) * COMMITS_PER_PAGE
    if (preloadThreshold >= availableCommitCount && currentHasMore && !currentLoading) {
      handleLoadMore()
    }
  }

  useEffect(() => {
    const isNearEnd = (commitPage + 2) * COMMITS_PER_PAGE >= availableCommitCount
    if (isNearEnd && currentHasMore && !currentLoading && availableCommitCount > 0) {
      handleLoadMoreRef.current()
    }
  }, [commitPage, availableCommitCount, currentHasMore, currentLoading])

  const observeLoadMore = useIntersectionObserver<HTMLDivElement>(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) handleLoadMoreRef.current()
    },
    { threshold: 0.5, enabled: viewMode !== "reflog" },
  )

  const commits = filteredCommits.slice(commitPage * COMMITS_PER_PAGE, (commitPage + 1) * COMMITS_PER_PAGE)
  const hashParam = searchParams.get("hash")
  const logCommits = repo.log
  const graphCommits = repo.graph
  const selectedHash = selectedCommit?.hash
  useEffect(() => {
    if (!hashParam || selectedHash === hashParam) return
    const found =
      logCommits.find((c) => c.hash === hashParam || c.short === hashParam) ??
      graphCommits.find((c) => c.hash === hashParam || c.short === hashParam)
    if (found) setSelectedCommit(found)
  }, [hashParam, logCommits, graphCommits, selectedHash])
  const branches = useMemo(
    () =>
      scope === "commits" || scope === "files"
        ? repo.branches
        : repo.branches.filter((branch) => matchesQuery(branch.name, query)),
    [repo.branches, query, scope],
  )

  return (
    <ResizableSplitLayout
      sidebarWidth={{ initial: 300, min: 220, max: 560, storageKey: "graph.side" }}
      sidebar={
        <>
          <div className={styles.sideHead}>
            <strong>{t(lang, "branches").toUpperCase()}</strong>
          </div>
          <SearchBox placeholder={t(lang, "searchPh")} />
          <Branch.Panel
            branches={branches}
            currentBranchName={repo.status?.branch ?? ""}
            newBranchName={repo.newBranch}
            onNewBranchNameChange={repo.setNewBranch}
            onCreateBranch={repo.createBranch}
            onCheckoutBranch={repo.checkoutBranch}
            onDeleteBranch={(branchName) => repo.deleteBranch(branchName, false)}
            onRenameBranch={repo.renameBranch}
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
                onClick={() => setViewMode("log")}
              >
                <List size={14} />
                <span>{t(lang, "logView")}</span>
              </button>
              <button
                type="button"
                className={classnames(styles.toggleBtn, viewMode === "graph" && styles.active)}
                onClick={() => setViewMode("graph")}
              >
                <GitBranch size={14} />
                <span>{t(lang, "graphView")}</span>
              </button>
              <button
                type="button"
                className={classnames(styles.toggleBtn, viewMode === "reflog" && styles.active)}
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
                onCheckout={(hash) => repo.checkoutBranch(hash)}
                onReset={(hash, mode) => repo.resetBranch(hash, mode)}
                onCherryPick={(hash) => repo.cherryPick(hash)}
              />
            ) : (
              <>
                <Commit.List
                  commits={commits}
                  currentBranchName={repo.status?.branch ?? ""}
                  showGraph={viewMode === "graph"}
                  selectedHash={selectedCommit?.hash}
                  onSelect={(commit) => {
                    setSelectedCommit(commit)
                    setSearchParams((prev) => {
                      const nextSearchParams = new URLSearchParams(prev)
                      if (commit?.hash) nextSearchParams.set("hash", commit.hash)
                      else nextSearchParams.delete("hash")
                      return nextSearchParams
                    })
                  }}
                  onAmend={handleAmend}
                />
                <Pagination
                  currentPage={commitPage}
                  totalItems={filteredCommits.length}
                  pageSize={COMMITS_PER_PAGE}
                  hasMore={currentHasMore}
                  loading={currentLoading}
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
                      {t(lang, "cancel") ?? "Cancelar"}
                    </button>
                    <button type="button" className="primary" onClick={confirmAmend} disabled={!amendApi.canCommit}>
                      {t(lang, "save") ?? "Salvar"}
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
            <Commit.Detail
              commit={selectedCommit}
              onClose={() => setSelectedCommit(null)}
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
