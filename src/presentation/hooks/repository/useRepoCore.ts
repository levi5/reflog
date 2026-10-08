import { mergeStatsUseCase } from "../../../data"
import { _Either, _pipe } from "funcio"
import { useCallback, useMemo, useState } from "react"
import { formatMessage, t } from "../../../i18n"
import { gitApi as defaultGitApi } from "../../../infrastructure/git"
import type { IGitApi } from "../../../infrastructure/git/types"
import type { Lang } from "../../../types"
import { useMessageActions } from "../../context"
import { useBranchOps } from "../branch/useBranchOps"
import type { RunAction } from "./action-types"
import { useCommitReads } from "./useCommitReads"
import { useGitAction } from "./useGitAction"
import { useUndoStack } from "../ui/useUndoStack"
import { useRepositoryData } from "./useRepositoryData"
import { useGitActions } from "./useGitActions"
import { useRecents } from "./useRecents"
import { useRemoteOps } from "./useRemoteOps"
import { useRepoOpener } from "./useRepoOpener"
import { useRepoScope } from "./useRepoScope"
import { useSyncOps } from "./useSyncOps"
import { useTagOps } from "./useTagOps"

export type View =
  | "graph"
  | "staging"
  | "merge"
  | "blame"
  | "compare"
  | "visualize"
  | "automation"
  | "monitors"
  | "templates"
  | "settings"
  | "docs"

export function useRepoCore(lang: Lang, git: IGitApi = defaultGitApi) {
  const [repoInput, setRepoInput] = useState("")
  const [repo, setRepo] = useState("")
  const { recents, pushRecent, clearRecents, removeRecent } = useRecents()
  const [busy, setBusy] = useState(false)
  const [busyStartedAt, setBusyStartedAt] = useState<number | null>(null)
  const [busyLabel, setBusyLabel] = useState<string | null>(null)
  const [opening, setOpening] = useState(false)
  const [msg, setMsg] = useState("")

  const [lastError, setLastError] = useState<string | null>(null)
  const [pendingConfirm, setPendingConfirm] = useState<{
    title: string
    message: string
    resolve: (value: boolean) => void
  } | null>(null)

  const messageService = useMessageActions()

  const requestConfirm = useCallback((title: string, message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const settle = (value: boolean) => {
        setPendingConfirm(null)
        resolve(value)
      }
      setPendingConfirm({ title, message, resolve: settle })
    })
  }, [])

  const data = useRepositoryData({ repo, git, setBusy, setMsg })
  const { status, conflicts, setConflicts, gitVersion, gpg, reflog, logPage, graphPage, refresh } = data

  const fail = useCallback(
    (e: unknown, fallbackMessage?: string) => {
      const errorMessage = String(e)
      setMsg(errorMessage)
      setLastError(errorMessage)
      messageService.error(fallbackMessage || errorMessage || t(lang, "actionFailed"))
    },
    [lang, messageService],
  )

  const { handleOpen, handleBrowse, pickDir, cloneRepo, initRepo } = useRepoOpener({
    lang,
    repoInput,
    opening,
    setRepoInput,
    setRepo,
    setMsg,
    setBusy,
    setOpening,
    pushRecent,
    fail,
    messageService,
    git,
  })

  const scope = useRepoScope(repo, git)
  const undoStack = useUndoStack()

  const runUndo = useCallback(
    async (direction: "undo" | "redo") => {
      const entry = direction === "undo" ? undoStack.undo() : undoStack.redo()
      if (!entry) return
      await entry.run()
    },
    [undoStack],
  )

  const undoLast = useCallback(() => runUndo("undo"), [runUndo])
  const redoLast = useCallback(() => runUndo("redo"), [runUndo])

  const runAction: RunAction = useCallback(
    async (work, after, options) => {
      if (!repo) return
      const loadingText = options?.loadingMessage ?? t(lang, "actionProcessing")
      const loadingId = messageService.loading(loadingText, options?.title)
      setBusy(true)
      setBusyStartedAt(Date.now())
      setBusyLabel(loadingText)

      const result = await _Either.try.async(work)

      if (result.isRight()) {
        const out = result.value
        messageService.dismiss(loadingId)
        const successText =
          options?.successMessage ?? (typeof out === "string" && out.trim() ? out : t(lang, "actionSuccess"))
        if (options?.undo) {
          undoStack.push(options.undoLabel ?? t(lang, "undo"), options.undo)
        }
        if (successText) {
          messageService.success(successText, options?.title, {
            duration: options?.successDuration,
            action:
              options?.successAction ??
              (options?.undo ? { label: t(lang, "undo"), onAction: () => void options.undo?.() } : undefined),
          })
          if (typeof out === "string") setMsg(out)
        }
        after?.()
        await refresh(repo)
      } else {
        const failure = result.value
        messageService.dismiss(loadingId)
        const errorMsg = options?.errorMessage ?? (failure instanceof Error ? failure.message : String(failure))
        fail(failure, errorMsg)
      }

      setBusy(false)
      setBusyStartedAt(null)
      setBusyLabel(null)
    },
    [repo, lang, messageService, fail, refresh, undoStack],
  )

  const actionDeps = { lang, repo, runAction, requestConfirm, git }
  const branchOps = useBranchOps(actionDeps)
  const tagOps = useTagOps(actionDeps)
  const remoteOps = useRemoteOps(actionDeps)
  const gitActions = useGitActions(actionDeps)

  const gitAction = useGitAction(lang, runAction)

  const syncOps = useSyncOps({ lang, repo, git, runAction })

  const amendCommit = useCallback(
    (repoPath: string, message: string, signoff = false, sign = false) =>
      gitAction(() => git.amendCommit(repoPath, message, signoff, sign), "amendCommitLoading", "amendCommitSuccess"),
    [git, gitAction],
  )

  const { loadCommitFiles, loadCommitDiff, compareRefs, searchHistory } = useCommitReads({ repo, git })

  const openTerminalHint = useCallback(async () => {
    const target = status?.root ?? repo
    if (!target) return
    const command = `cd "${target}"`
    try {
      await navigator.clipboard.writeText(command)
      setMsg(formatMessage(lang, "terminalCommandCopied", { command }))
    } catch {
      setMsg(`${t(lang, "terminalHint")} ${target}`)
    }
  }, [lang, status?.root, repo])

  const repoName = useMemo(
    () =>
      _pipe(status?.root ?? repo, (path: string) => {
        return path ? mergeStatsUseCase.repoBaseName(path) : "—"
      }),
    [status?.root, repo],
  )

  return {
    repoInput,
    setRepoInput,
    repo,
    recents,
    repoChain: scope.chain,
    parentRepo: scope.parent,
    isSubmodule: scope.isSubmodule,
    openRecent: useCallback((path: string) => handleOpen(path), [handleOpen]),
    clearRecents,
    removeRecent,
    status,
    branches: data.branches,
    localBranches: data.localBranches,
    tags: data.tags,
    remotes: data.remotes,
    submodules: data.submodules,
    log: logPage.items,
    graph: graphPage.items,
    totalCommits: data.totalCommits,
    conflicts,
    setConflicts,
    busy: busy || opening,
    busyStartedAt,
    busyLabel,
    canUndo: undoStack.canUndo,
    canRedo: undoStack.canRedo,
    undoLabel: undoStack.pendingLabel,
    undoLast,
    redoLast,
    clearUndoStack: undoStack.clear,
    opening,
    setBusy,
    msg,
    setMsg,
    lastError,
    clearError: useCallback(() => setLastError(null), []),
    gitVersion,
    remoteUrl: data.remoteUrl,
    gpg,
    repoName,
    refresh,
    handleOpen,
    handleBrowse,
    pickDir,
    cloneRepo,
    initRepo,
    runAction,
    checkoutBranch: branchOps.checkoutBranch,
    createBranchFrom: branchOps.createBranchFrom,
    deleteBranch: branchOps.deleteBranch,
    renameBranch: branchOps.renameBranch,
    fetchPrune: syncOps.fetchPrune,
    fetchFromRemote: syncOps.fetchFromRemote,
    pushForce: syncOps.pushForce,
    pushTags: syncOps.pushTags,
    deleteRemoteBranch: syncOps.deleteRemoteBranch,
    setUpstream: syncOps.setUpstream,
    createTag: tagOps.createTag,
    deleteTag: tagOps.deleteTag,
    pushTag: tagOps.pushTag,
    addRemote: remoteOps.addRemote,
    removeRemote: remoteOps.removeRemote,
    pullIt: syncOps.pullIt,
    pushIt: syncOps.pushIt,
    amendCommit,
    loadMoreLog: logPage.loadMore,
    reflog,
    reflogLoading: data.reflogLoading,
    reflogLoaded: data.reflogLoaded,
    loadReflog: data.loadReflog,
    cherryPick: gitActions.cherryPick,
    cherryPickContinue: gitActions.cherryPickContinue,
    cherryPickAbort: gitActions.cherryPickAbort,
    revert: gitActions.revert,
    revertContinue: gitActions.revertContinue,
    revertAbort: gitActions.revertAbort,
    resetBranch: gitActions.resetBranch,
    rebaseStart: gitActions.rebaseStart,
    rebaseContinue: gitActions.rebaseContinue,
    rebaseAbort: gitActions.rebaseAbort,
    loadCommitFiles,
    loadCommitDiff,
    compareRefs,
    searchHistory,

    loadMoreGraph: graphPage.loadMore,
    logLoading: logPage.loading,
    graphLoading: graphPage.loading,
    logHasMore: logPage.hasMore,
    graphHasMore: graphPage.hasMore,
    openTerminalHint,
    pendingConfirm,
    requestConfirm,
  }
}
