import { _Either } from "funcio"
import { useCallback, useEffect, useRef, useState } from "react"
import { commitTemplateUseCase } from "../../../data"
import { gitApi } from "../../../infrastructure/git"
import { t } from "../../../i18n"
import type { Lang, SubmoduleInfo } from "../../../types"

import { useFileEditor } from "../staging/useFileEditor"
import { useStashOps } from "../staging/useStashOps"
import { useStagingBlame } from "../staging/useStagingBlame"
import { useStagingDiff } from "../staging/useStagingDiff"
import { useStagingIndexOps } from "../staging/useStagingIndexOps"
import type { RunAction } from "./action-types"

export interface StagingDeps {
  lang: Lang
  repo: string
  submodules: SubmoduleInfo[]
  runAction: RunAction
  requestConfirm: (title: string, message: string) => Promise<boolean>
  setMsg: (m: string) => void
}

export function useStaging(deps: StagingDeps) {
  const { lang, repo, submodules, runAction, requestConfirm, setMsg } = deps
  const [commitMsg, setCommitMsg] = useState("")
  const [newBranch, setNewBranch] = useState("")
  const [trackedFiles, setTrackedFiles] = useState<string[]>([])

  const diffPanel = useStagingDiff({ lang, repo })
  const blamePanel = useStagingBlame({ repo })

  const handleFileSaved = useCallback(
    (file: string) => {
      if (file === diffPanel.selectedFile) void diffPanel.loadDiff(file, diffPanel.diffStaged)
      if (file === blamePanel.blameFile) void blamePanel.loadBlame(file)
    },
    [diffPanel.selectedFile, diffPanel.diffStaged, diffPanel.loadDiff, blamePanel.blameFile, blamePanel.loadBlame],
  )

  const editor = useFileEditor({
    lang,
    repo,
    runAction,
    requestConfirm,
    setMsg,
    onFileSaved: handleFileSaved,
  })

  const stashOps = useStashOps({
    lang,
    repo,
    runAction,
    requestConfirm,
    setMsg,
  })

  const indexOps = useStagingIndexOps({
    lang,
    repo,
    runAction,
    requestConfirm,
    loadDiff: diffPanel.loadDiff,
    reloadDiff: diffPanel.reloadDiff,
    clearDiffIfSelected: diffPanel.clearDiffIfSelected,
  })

  const repoRef = useRef(repo)

  useEffect(() => {
    if (repoRef.current === repo) return
    repoRef.current = repo
    diffPanel.selectDiff("", false)
    blamePanel.resetBlame()
    setTrackedFiles([])
  }, [repo, diffPanel.selectDiff, blamePanel.resetBlame])

  const doCommit = useCallback(() => {
    if (!repo || !commitMsg.trim()) return Promise.resolve()
    const message = commitMsg
    const opts = commitTemplateUseCase.getLastCommitOpts()
    return runAction(
      () => gitApi.commit(repo, message, opts.signoff, opts.sign),
      () => setCommitMsg(""),
      {
        loadingMessage: t(lang, "committing"),
        successMessage: t(lang, "committed"),
      },
    )
  }, [repo, commitMsg, runAction, lang])

  const createBranch = useCallback(() => {
    if (!repo || !newBranch.trim()) return Promise.resolve()
    const name = newBranch.trim()
    return runAction(
      () => gitApi.checkout(repo, name, true),
      () => setNewBranch(""),
      {
        loadingMessage: t(lang, "createBranchLoading"),
        successMessage: t(lang, "createBranchSuccess"),
      },
    )
  }, [repo, newBranch, runAction, lang])

  const submoduleUpdate = useCallback(
    (submodulePath?: string) =>
      runAction(() => gitApi.submoduleUpdate(repo, submodulePath), undefined, {
        loadingMessage: t(lang, "submoduleUpdating"),
        successMessage: t(lang, "submoduleUpdated"),
      }),
    [repo, lang, runAction],
  )

  const stageHunk = useCallback(
    (patch: string) =>
      runAction(() => gitApi.applyPatch(repo, patch, true, false), diffPanel.reloadDiff, {
        loadingMessage: t(lang, "hunkStageLoading"),
        successMessage: t(lang, "hunkStageSuccess"),
      }),
    [repo, runAction, lang, diffPanel.reloadDiff],
  )

  const unstageHunk = useCallback(
    (patch: string) =>
      runAction(() => gitApi.applyPatch(repo, patch, true, true), diffPanel.reloadDiff, {
        loadingMessage: t(lang, "hunkUnstageLoading"),
        successMessage: t(lang, "hunkUnstageSuccess"),
      }),
    [repo, runAction, lang, diffPanel.reloadDiff],
  )

  const stageSelected = useCallback(
    (patch: string) =>
      runAction(() => gitApi.applyPatch(repo, patch, true, false), diffPanel.reloadDiff, {
        loadingMessage: t(lang, "hunkStageLoading"),
        successMessage: t(lang, "hunkStageSuccess"),
      }),
    [repo, runAction, lang, diffPanel.reloadDiff],
  )

  const unstageSelected = useCallback(
    (patch: string) =>
      runAction(() => gitApi.applyPatch(repo, patch, true, true), diffPanel.reloadDiff, {
        loadingMessage: t(lang, "hunkUnstageLoading"),
        successMessage: t(lang, "hunkUnstageSuccess"),
      }),
    [repo, runAction, lang, diffPanel.reloadDiff],
  )

  const discardHunk = useCallback(
    async (patch: string) => {
      if (!repo || !patch.trim()) return Promise.resolve()
      if (!(await requestConfirm(t(lang, "discard"), t(lang, "discardConfirm")))) return Promise.resolve()
      return runAction(() => gitApi.applyPatch(repo, patch, false, true), diffPanel.reloadDiff, {
        loadingMessage: t(lang, "discardHunkLoading"),
        successMessage: t(lang, "discardHunkSuccess"),
        successDuration: 8000,
        undoLabel: t(lang, "undoDiscardHunk"),
        undo: () =>
          runAction(() => gitApi.applyPatch(repo, patch, false, false), diffPanel.reloadDiff, {
            loadingMessage: t(lang, "actionProcessing"),
            successMessage: t(lang, "actionSuccess"),
          }),
      })
    },
    [repo, lang, requestConfirm, runAction, diffPanel.reloadDiff],
  )

  const loadTracked = useCallback(async () => {
    if (!repo) return
    const result = await _Either.try.async(() => gitApi.lsFiles(repo))
    if (result.isRight()) {
      setTrackedFiles(result.value as string[])
    } else {
      setMsg(String(result.value))
    }
  }, [repo, setMsg])

  useEffect(() => {
    if (repo) {
      void stashOps.loadStashes()
    }
  }, [repo, stashOps.loadStashes])

  return {
    ...diffPanel,
    ...blamePanel,
    ...indexOps,
    commitMsg,
    setCommitMsg,
    newBranch,
    setNewBranch,
    stashMsg: stashOps.stashMsg,
    setStashMsg: stashOps.setStashMsg,
    stashKeepIndex: stashOps.stashKeepIndex,
    setStashKeepIndex: stashOps.setStashKeepIndex,
    stashStagedOnly: stashOps.stashStagedOnly,
    setStashStagedOnly: stashOps.setStashStagedOnly,
    stashPaths: stashOps.stashPaths,
    setStashPaths: stashOps.setStashPaths,
    stashes: stashOps.stashes,
    loadStashes: stashOps.loadStashes,
    stashApply: stashOps.stashApply,
    stashApplyFile: stashOps.stashApplyFile,
    stashBranch: stashOps.stashBranch,
    stashDrop: stashOps.stashDrop,
    stashShow: stashOps.stashShow,
    stashPush: stashOps.stashPush,
    stashPopIt: stashOps.stashPopIt,
    submodules,
    submoduleUpdate,
    trackedFiles,
    loadTracked,
    doCommit,
    createBranch,
    stageHunk,
    unstageHunk,
    stageSelected,
    unstageSelected,
    discardHunk,
    editingFile: editor.editingFile,
    editContent: editor.editContent,
    editDraft: editor.editDraft,
    setEditDraft: editor.setEditDraft,
    editLoading: editor.editLoading,
    openEditor: editor.openEditor,
    closeEditor: editor.closeEditor,
    saveEditor: editor.saveEditor,
  }
}
