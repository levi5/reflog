import { _Either } from "funcio"
import { useCallback, useEffect, useRef, useState } from "react"
import type { BlameLine } from "../../../domain/entities/blame/blame"
import { gitApi } from "../../../infrastructure/git"
import { t } from "../../../i18n"
import { getLastCommitOpts, parseBlamePorcelain } from "../../../main/adapters"
import type { Lang, SubmoduleInfo } from "../../../types"

import { useFileEditor } from "../staging/useFileEditor"
import { useStashOps } from "../staging/useStashOps"
import type { RunAction } from "./action-types"

export interface StagingDeps {
  lang: Lang
  repo: string
  runAction: RunAction
  requestConfirm: (title: string, message: string) => Promise<boolean>
  setMsg: (m: string) => void
}

export function useStaging(deps: StagingDeps) {
  const { lang, repo, runAction, requestConfirm, setMsg } = deps
  const [selectedFile, setSelectedFile] = useState("")
  const [diff, setDiff] = useState("")
  const [diffStaged, setDiffStaged] = useState(false)
  const [diffLoaded, setDiffLoaded] = useState(false)
  const [diffLoading, setDiffLoading] = useState(false)
  const [diffError, setDiffError] = useState<string | null>(null)
  const diffRequestRef = useRef(0)
  const [commitMsg, setCommitMsg] = useState("")
  const [newBranch, setNewBranch] = useState("")
  const [blameFile, setBlameFile] = useState("")
  const [blameLines, setBlameLines] = useState<BlameLine[]>([])
  const [trackedFiles, setTrackedFiles] = useState<string[]>([])
  const [submodules, setSubmodules] = useState<SubmoduleInfo[]>([])

  const selectDiff = useCallback((file: string, staged: boolean) => {
    diffRequestRef.current += 1
    setSelectedFile(file)
    setDiffStaged(staged)
    setDiff("")
    setDiffLoaded(false)
    setDiffLoading(false)
    setDiffError(null)
  }, [])

  const loadDiff = useCallback(
    async (file = selectedFile, staged = diffStaged) => {
      if (!repo) return
      const request = diffRequestRef.current + 1
      diffRequestRef.current = request
      setSelectedFile(file)
      setDiffStaged(staged)
      setDiff("")
      setDiffLoaded(false)
      setDiffError(null)
      setDiffLoading(true)
      const result = await _Either.try.async(() => gitApi.diff(repo, file, staged))
      if (request !== diffRequestRef.current) return
      if (result.isRight()) {
        setDiff((result.value as string) || t(lang, "noDiff"))
        setDiffLoaded(true)
      } else {
        setDiffError(String(result.value))
      }
      setDiffLoading(false)
    },
    [repo, lang, selectedFile, diffStaged],
  )

  const loadBlame = useCallback(
    async (file: string) => {
      if (!repo || !file) return
      setBlameFile(file)
      const result = await _Either.try.async(() => gitApi.blame(repo, file))
      if (result.isRight()) {
        setBlameLines(parseBlamePorcelain(result.value as string))
      } else {
        setBlameLines([])
        setMsg(String(result.value))
      }
    },
    [repo, setMsg],
  )

  const handleFileSaved = useCallback(
    (file: string) => {
      if (file === selectedFile) void loadDiff(file, diffStaged)
      if (file === blameFile) void loadBlame(file)
    },
    [selectedFile, diffStaged, blameFile, loadDiff, loadBlame],
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

  const loadSubmodules = useCallback(async () => {
    if (!repo) return
    const result = await _Either.try.async(() => gitApi.submodules(repo))
    if (result.isRight()) {
      setSubmodules(result.value as SubmoduleInfo[])
    } else {
      setMsg(String(result.value))
    }
  }, [repo, setMsg])

  const repoRef = useRef(repo)

  useEffect(() => {
    if (repoRef.current === repo) return
    repoRef.current = repo
    diffRequestRef.current += 1
    setSelectedFile("")
    setDiff("")
    setDiffLoaded(false)
    setDiffLoading(false)
    setDiffError(null)
  }, [repo])

  useEffect(() => {
    if (repo) {
      void stashOps.loadStashes()
      void loadSubmodules()
    }
  }, [repo, stashOps.loadStashes, loadSubmodules])

  const doCommit = () => {
    if (!repo || !commitMsg.trim()) return Promise.resolve()
    const message = commitMsg
    const opts = getLastCommitOpts()
    return runAction(
      () => gitApi.commit(repo, message, opts.signoff, opts.sign),
      () => setCommitMsg(""),
      {
        loadingMessage: t(lang, "committing"),
        successMessage: t(lang, "committed"),
      },
    )
  }

  const createBranch = () => {
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
  }

  const submoduleUpdate = useCallback(
    (submodulePath?: string) =>
      runAction(() => gitApi.submoduleUpdate(repo, submodulePath), loadSubmodules, {
        loadingMessage: t(lang, "submoduleUpdating"),
        successMessage: t(lang, "submoduleUpdated"),
      }),
    [repo, lang, runAction, loadSubmodules],
  )

  const stageFile = (file: string) =>
    runAction(
      () => gitApi.add(repo, [file]),
      () => loadDiff(file, true),
      {
        loadingMessage: t(lang, "stageFileLoading"),
        successMessage: t(lang, "stageFileSuccess"),
      },
    )

  const unstageFile = (file: string) =>
    runAction(
      () => gitApi.unstage(repo, file),
      () => loadDiff(file, false),
      {
        loadingMessage: t(lang, "unstageFileLoading"),
        successMessage: t(lang, "unstageFileSuccess"),
      },
    )

  const discardFile = async (file: string) => {
    if (!repo || !file) return Promise.resolve()
    if (!(await requestConfirm(t(lang, "discard"), t(lang, "discardConfirm")))) return Promise.resolve()
    const captured = await _Either.try.async(() => gitApi.diff(repo, file, false))
    const undoPatch = captured.isRight() ? String(captured.value ?? "") : ""
    return runAction(
      () => gitApi.discard(repo, file),
      () => loadDiff(file, false),
      {
        loadingMessage: t(lang, "discardFileLoading"),
        successMessage: t(lang, "discardFileSuccess"),
        successDuration: undoPatch.trim() ? 8000 : undefined,
        successAction: undoPatch.trim()
          ? {
              label: t(lang, "undo"),
              onAction: () => {
                void runAction(
                  () => gitApi.applyPatch(repo, undoPatch, false, false),
                  () => loadDiff(file, false),
                  {
                    loadingMessage: t(lang, "actionProcessing"),
                    successMessage: t(lang, "actionSuccess"),
                  },
                )
              },
            }
          : undefined,
      },
    )
  }

  const stageAll = () =>
    runAction(() => gitApi.add(repo, []), undefined, {
      loadingMessage: t(lang, "staging"),
      successMessage: t(lang, "stageSuccess"),
    })

  const stageFiles = (files: string[]) => {
    if (!repo || files.length === 0) return Promise.resolve()
    return runAction(() => gitApi.add(repo, files), reloadDiff, {
      loadingMessage: t(lang, "staging"),
      successMessage: t(lang, "stageSuccess"),
    })
  }

  const unstageFiles = (files: string[]) => {
    if (!repo || files.length === 0) return Promise.resolve()
    return runAction(
      async () => {
        for (const file of files) {
          await gitApi.unstage(repo, file)
        }
        return ""
      },
      reloadDiff,
      {
        loadingMessage: t(lang, "unstaging"),
        successMessage: t(lang, "unstageSuccess"),
      },
    )
  }

  const discardFiles = async (files: string[]) => {
    if (!repo || files.length === 0) return Promise.resolve()
    if (!(await requestConfirm(t(lang, "discard"), t(lang, "discardSelectedConfirm")))) {
      return Promise.resolve()
    }
    return runAction(
      async () => {
        for (const file of files) {
          await gitApi.discard(repo, file)
        }
        return ""
      },
      reloadDiff,
      {
        loadingMessage: t(lang, "discarding"),
        successMessage: t(lang, "discarded"),
      },
    )
  }

  const reloadDiff = () => {
    if (selectedFile) void loadDiff(selectedFile, diffStaged)
  }

  const stageHunk = (patch: string) =>
    runAction(() => gitApi.applyPatch(repo, patch, true, false), reloadDiff, {
      loadingMessage: t(lang, "hunkStageLoading"),
      successMessage: t(lang, "hunkStageSuccess"),
    })

  const unstageHunk = (patch: string) =>
    runAction(() => gitApi.applyPatch(repo, patch, true, true), reloadDiff, {
      loadingMessage: t(lang, "hunkUnstageLoading"),
      successMessage: t(lang, "hunkUnstageSuccess"),
    })

  const stageSelected = (patch: string) =>
    runAction(() => gitApi.applyPatch(repo, patch, true, false), reloadDiff, {
      loadingMessage: t(lang, "hunkStageLoading"),
      successMessage: t(lang, "hunkStageSuccess"),
    })

  const unstageSelected = (patch: string) =>
    runAction(() => gitApi.applyPatch(repo, patch, true, true), reloadDiff, {
      loadingMessage: t(lang, "hunkUnstageLoading"),
      successMessage: t(lang, "hunkUnstageSuccess"),
    })

  const discardHunk = async (patch: string) => {
    if (!repo || !patch.trim()) return Promise.resolve()
    if (!(await requestConfirm(t(lang, "discard"), t(lang, "discardConfirm")))) return Promise.resolve()
    return runAction(() => gitApi.applyPatch(repo, patch, false, true), reloadDiff, {
      loadingMessage: t(lang, "discardHunkLoading"),
      successMessage: t(lang, "discardHunkSuccess"),
      successDuration: 8000,
      successAction: {
        label: t(lang, "undo"),
        onAction: () => {
          void runAction(() => gitApi.applyPatch(repo, patch, false, false), reloadDiff, {
            loadingMessage: t(lang, "actionProcessing"),
            successMessage: t(lang, "actionSuccess"),
          })
        },
      },
    })
  }

  const loadTracked = useCallback(async () => {
    if (!repo) return
    const result = await _Either.try.async(() => gitApi.lsFiles(repo))
    if (result.isRight()) {
      setTrackedFiles(result.value as string[])
    } else {
      setMsg(String(result.value))
    }
  }, [repo, setMsg])

  return {
    selectedFile,
    diff,
    diffStaged,
    diffLoaded,
    diffLoading,
    diffError,
    commitMsg,
    setCommitMsg,
    newBranch,
    setNewBranch,
    stashMsg: stashOps.stashMsg,
    setStashMsg: stashOps.setStashMsg,
    stashes: stashOps.stashes,
    loadStashes: stashOps.loadStashes,
    stashApply: stashOps.stashApply,
    stashDrop: stashOps.stashDrop,
    stashShow: stashOps.stashShow,
    stashPush: stashOps.stashPush,
    stashPopIt: stashOps.stashPopIt,
    submodules,
    loadSubmodules,
    submoduleUpdate,
    blameFile,
    blameLines,
    trackedFiles,
    selectDiff,
    loadDiff,
    loadBlame,
    loadTracked,
    doCommit,
    createBranch,
    stageFile,
    unstageFile,
    discardFile,
    stageHunk,
    unstageHunk,
    discardHunk,
    stageSelected,
    unstageSelected,
    stageAll,
    stageFiles,
    unstageFiles,
    discardFiles,
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
