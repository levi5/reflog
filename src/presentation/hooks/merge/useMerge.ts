import { commitTemplateUseCase, conflictResolverUseCase, mergeStatsUseCase } from "../../../data"
import { useEffect, useRef, useState } from "react"
import { t } from "../../../i18n"
import { gitApi } from "../../../infrastructure/git"
import type { ConflictFile, Lang, StatusResult } from "../../../types"
import type { RunAction } from "../repository/action-types"

export interface MergeDeps {
  lang: Lang
  repo: string
  status: StatusResult | null
  conflicts: ConflictFile[]
  setConflicts: (cf: ConflictFile[]) => void
  refresh: (root: string) => Promise<void>
  runAction: RunAction
  setBusy: (b: boolean) => void
  setMsg: (m: string) => void
  readCommitMessage: () => string
  clearCommitMessage: () => void
}

export function useMerge(deps: MergeDeps) {
  const {
    lang,
    repo,
    status,
    conflicts,
    setConflicts,
    refresh,
    runAction,
    setBusy,
    setMsg,
    readCommitMessage,
    clearCommitMessage,
  } = deps
  const [activeConflict, setActiveConflict] = useState("")
  const [editorContent, setEditorContent] = useState("")
  const [mergeBranch, setMergeBranch] = useState("")
  const [mergeSquash, setMergeSquash] = useState(false)
  const [mergeNoFF, setMergeNoFF] = useState(false)
  const [resolvedMap, setResolvedMap] = useState<Record<string, number>>({})

  const activeRef = useRef(activeConflict)
  const contentRef = useRef(editorContent)
  activeRef.current = activeConflict
  contentRef.current = editorContent

  useEffect(() => {
    setResolvedMap((prev) => mergeStatsUseCase.pruneResolved(prev, conflicts))
    if (conflicts.length === 0) return
    const keep = conflicts.find((f) => f.path === activeRef.current) ?? conflicts[0]
    if (activeRef.current !== keep.path || !contentRef.current) {
      setActiveConflict(keep.path)
      setEditorContent(keep.content)
    }
  }, [conflicts])

  const fail = (e: unknown) => setMsg(String(e))

  const selectConflictFile = (path: string) => {
    const found = conflicts.find((c) => c.path === path)
    if (!found) return
    setActiveConflict(found.path)
    setEditorContent(found.content)
  }

  const saveConflictFile = () => {
    if (!repo || !activeConflict) return Promise.resolve()
    const path = activeConflict
    const content = editorContent
    if (conflictResolverUseCase.parseConflicts(content).length > 0) {
      setMsg(t(lang, "conflictMarkers"))
      return Promise.resolve()
    }
    setBusy(true)
    return gitApi
      .saveContent(repo, path, content)
      .then(() => setMsg(t(lang, "saved")))
      .then(() => gitApi.conflicted(repo))
      .then(setConflicts)
      .catch(fail)
      .finally(() => setBusy(false))
  }

  const resolveConflictFile = () => {
    if (!repo || !activeConflict) return Promise.resolve()
    const path = activeConflict
    const content = editorContent
    if (conflictResolverUseCase.parseConflicts(content).length > 0) {
      setMsg(t(lang, "cannotResolve"))
      return Promise.resolve()
    }
    const before =
      conflicts.find((f) => f.path === path)?.conflicts.length ?? conflictResolverUseCase.parseConflicts(content).length
    return runAction(
      () => gitApi.saveContent(repo, path, content).then(() => gitApi.add(repo, [path])),
      () => {
        setResolvedMap((m) => ({ ...m, [path]: Math.max(before, 1) }))
        setMsg(t(lang, "resolved"))
      },
      {
        loadingMessage: t(lang, "saveConflictLoading"),
        successMessage: t(lang, "saveConflictSuccess"),
      },
    )
  }

  const continueMerge = () => {
    const msg = readCommitMessage().trim() || "Merge conflict resolved"
    const opts = commitTemplateUseCase.getLastCommitOpts()
    return runAction(
      () => gitApi.add(repo, []).then(() => gitApi.commit(repo, msg, opts.signoff, opts.sign)),
      () => {
        commitTemplateUseCase.pushHistory(msg)
        clearCommitMessage()
        setResolvedMap({})
      },
      {
        loadingMessage: t(lang, "continueMergeLoading"),
        successMessage: t(lang, "continueMergeSuccess"),
      },
    )
  }

  const startMerge = () => {
    if (!repo || !mergeBranch.trim()) return Promise.resolve()
    if (status?.merging) {
      setMsg(t(lang, "mergeInProgressHint"))
      return Promise.resolve()
    }
    if (conflicts.length > 0) {
      setMsg(t(lang, "unmergedFiles"))
      return Promise.resolve()
    }
    const branch = mergeBranch.trim()
    const squash = mergeSquash
    const noFF = mergeNoFF && !mergeSquash
    return runAction(
      () => gitApi.mergeOpts(repo, branch, squash, noFF).then((m) => m.trim() || "merge ok"),
      () => {
        setMergeBranch("")
        setMergeSquash(false)
        setMergeNoFF(false)
      },
      {
        loadingMessage: t(lang, "mergeBranchLoading"),
        successMessage: t(lang, "mergeBranchSuccess"),
      },
    ).catch(() => refresh(repo))
  }

  const abortMerge = () =>
    runAction(
      () => gitApi.mergeAbort(repo),
      () => setResolvedMap({}),
      {
        loadingMessage: t(lang, "abortMergeLoading"),
        successMessage: t(lang, "abortMergeSuccess"),
      },
    )

  return {
    conflicts,
    activeConflict,
    editorContent,
    setEditorContent,
    mergeBranch,
    setMergeBranch,
    mergeSquash,
    setMergeSquash,
    mergeNoFF,
    setMergeNoFF,
    resolvedMap,
    selectConflictFile,
    saveConflictFile,
    resolveConflictFile,
    continueMerge,
    startMerge,
    abortMerge,
  }
}
