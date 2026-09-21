import { _Either, _pipe } from "funcio"
import { useCallback, useMemo, useState } from "react"
import { t } from "../../../i18n"
import { gitApi as defaultGitApi } from "../../../infrastructure/git"
import type { IGitApi } from "../../../infrastructure/git/types"
import { repoBaseName } from "../../../main/adapters"
import type { CommitFileChange, Lang } from "../../../types"
import { useMessage } from "../../context"
import { useBranchOps } from "../branch/useBranchOps"
import type { RunAction } from "./action-types"
import { useGitAction } from "./useGitAction"
import { useRepositoryData } from "./useRepositoryData"
import { useGitActions } from "./useGitActions"
import { useRecents } from "./useRecents"
import { useRemoteOps } from "./useRemoteOps"
import { useRepoOpener } from "./useRepoOpener"
import { useTagOps } from "./useTagOps"

export type View =
  | "graph"
  | "staging"
  | "merge"
  | "blame"
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
  const [opening, setOpening] = useState(false)
  const [msg, setMsg] = useState("")

  const [lastError, setLastError] = useState<string | null>(null)
  const [pendingConfirm, setPendingConfirm] = useState<{
    title: string
    message: string
    resolve: (value: boolean) => void
  } | null>(null)

  const messageService = useMessage()

  const requestConfirm = useCallback((title: string, message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setPendingConfirm({ title, message, resolve })
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

  const { handleOpen, handleBrowse, pickDir, cloneRepo } = useRepoOpener({
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

  const runAction: RunAction = useCallback(
    async (work, after, options) => {
      if (!repo) return
      const loadingText = options?.loadingMessage ?? t(lang, "actionProcessing")
      const loadingId = messageService.loading(loadingText, options?.title)
      setBusy(true)

      const result = await _Either.try.async(work)

      if (result.isRight()) {
        const out = result.value
        messageService.dismiss(loadingId)
        const successText =
          options?.successMessage ?? (typeof out === "string" && out.trim() ? out : t(lang, "actionSuccess"))
        if (successText) {
          messageService.success(successText, options?.title, {
            duration: options?.successDuration,
            action: options?.successAction,
          })
          if (typeof out === "string") setMsg(out)
        }
        after?.()
        await refresh(repo)
      } else {
        const e = result.value
        messageService.dismiss(loadingId)
        const errorMsg = options?.errorMessage ?? (e instanceof Error ? e.message : String(e))
        fail(e, errorMsg)
      }

      setBusy(false)
    },
    [repo, lang, messageService, fail, refresh],
  )

  const actionDeps = { lang, repo, runAction, requestConfirm, git }
  const branchOps = useBranchOps(actionDeps)
  const tagOps = useTagOps(actionDeps)
  const remoteOps = useRemoteOps(actionDeps)
  const gitActions = useGitActions(actionDeps)

  const gitAction = useGitAction(lang, runAction)

  const pullIt = useCallback(() => gitAction(() => git.pull(repo), "pulling", "pulled"), [repo, git, gitAction])

  const pushIt = useCallback(
    () => gitAction(() => git.push(repo).then((m) => m || "pushed"), "pushing", "pushed"),
    [repo, git, gitAction],
  )

  const amendCommit = useCallback(
    (repoPath: string, message: string, signoff = false, sign = false) =>
      gitAction(() => git.amendCommit(repoPath, message, signoff, sign), "amendCommitLoading", "amendCommitSuccess"),
    [git, gitAction],
  )

  const fetchPrune = useCallback(
    () => gitAction(() => git.fetch(repo, true).then((m) => m.trim() || "fetched"), "fetchPrune", "fetchCompleted"),
    [repo, git, gitAction],
  )

  const loadCommitFiles = useCallback(
    (hash: string): Promise<CommitFileChange[]> => (repo && hash ? git.commitFiles(repo, hash) : Promise.resolve([])),
    [repo, git],
  )

  const loadCommitDiff = useCallback(
    (hash: string, file?: string) => (repo && hash ? git.commitDiff(repo, hash, file) : Promise.resolve("")),
    [repo, git],
  )

  const openTerminalHint = useCallback(
    () =>
      _pipe(status?.root ?? repo, (targetPath: string) => {
        setMsg(`${t(lang, "terminalHint")} ${targetPath}`)
      }),
    [lang, status?.root, repo],
  )

  const repoName = useMemo(
    () =>
      _pipe(status?.root ?? repo, (path: string) => {
        return path ? repoBaseName(path) : "—"
      }),
    [status?.root, repo],
  )

  return {
    repoInput,
    setRepoInput,
    repo,
    recents,
    openRecent: useCallback((path: string) => handleOpen(path), [handleOpen]),
    clearRecents,
    removeRecent,
    status,
    branches: data.branches,
    localBranches: data.localBranches,
    tags: data.tags,
    remotes: data.remotes,
    log: logPage.items,
    graph: graphPage.items,
    conflicts,
    setConflicts,
    busy: busy || opening,
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
    runAction,
    checkoutBranch: branchOps.checkoutBranch,
    deleteBranch: branchOps.deleteBranch,
    renameBranch: branchOps.renameBranch,
    fetchPrune,
    createTag: tagOps.createTag,
    deleteTag: tagOps.deleteTag,
    addRemote: remoteOps.addRemote,
    removeRemote: remoteOps.removeRemote,
    pullIt,
    pushIt,
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
    loadCommitFiles,
    loadCommitDiff,

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
